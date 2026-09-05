-- Extend the existing owner-scoped finance model with contribution provenance,
-- credit-card/loan metadata, and deterministic reminder de-duplication.
-- Existing forced RLS policies remain the authorization boundary.

alter type public.account_type add value if not exists 'current';
alter type public.account_type add value if not exists 'checking';
alter type public.account_type add value if not exists 'debit_card';
alter type public.account_type add value if not exists 'prepaid_card';

alter table public.goals
  add column opening_amount numeric(20,2) not null default 0
    check (opening_amount >= 0);

update public.goals
set opening_amount = current_amount;

alter table public.goal_contributions
  add column source_account_id uuid references public.accounts(id) on delete restrict,
  add column linked_transaction_id uuid references public.transactions(id) on delete restrict,
  add column updated_at timestamptz not null default timezone('utc', now());

create index goal_contributions_user_goal_date
  on public.goal_contributions(user_id, goal_id, contributed_at desc);
create index goal_contributions_source_account
  on public.goal_contributions(source_account_id)
  where source_account_id is not null;
create index goal_contributions_linked_transaction
  on public.goal_contributions(linked_transaction_id)
  where linked_transaction_id is not null;

create trigger goal_contributions_touch_updated_at
before update on public.goal_contributions
for each row execute function public.touch_updated_at();

create or replace function public.assert_goal_contribution_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_account_id is not null and not exists(
    select 1 from public.accounts
    where id = new.source_account_id and user_id = new.user_id
  ) then
    raise exception 'Source account is not owned by current user';
  end if;

  if new.linked_transaction_id is not null and not exists(
    select 1 from public.transactions
    where id = new.linked_transaction_id and user_id = new.user_id
  ) then
    raise exception 'Linked transaction is not owned by current user';
  end if;

  return new;
end;
$$;

create trigger goal_contributions_owned_links
before insert or update on public.goal_contributions
for each row execute function public.assert_goal_contribution_links();

create or replace function public.recalculate_goal_current_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_goal_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_goal_id = old.goal_id;
  else
    affected_goal_id = new.goal_id;
  end if;

  update public.goals as goal
  set current_amount = goal.opening_amount + coalesce((
    select sum(contribution.amount)
    from public.goal_contributions as contribution
    where contribution.goal_id = affected_goal_id
      and contribution.user_id = goal.user_id
  ), 0)
  where goal.id = affected_goal_id;

  if tg_op = 'UPDATE' and old.goal_id is distinct from new.goal_id then
    update public.goals as goal
    set current_amount = goal.opening_amount + coalesce((
      select sum(contribution.amount)
      from public.goal_contributions as contribution
      where contribution.goal_id = old.goal_id
        and contribution.user_id = goal.user_id
    ), 0)
    where goal.id = old.goal_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger goal_contributions_recalculate_goal
after insert or update or delete on public.goal_contributions
for each row execute function public.recalculate_goal_current_amount();

alter table public.accounts
  add column card_network text
    check (card_network is null or card_network in ('visa','mastercard','american_express','rupay')),
  add column credit_limit numeric(20,2)
    check (credit_limit is null or credit_limit > 0),
  add column statement_day smallint
    check (statement_day is null or statement_day between 1 and 31),
  add column payment_due_day smallint
    check (payment_due_day is null or payment_due_day between 1 and 31),
  add column minimum_payment numeric(20,2)
    check (minimum_payment is null or minimum_payment >= 0),
  add column payment_account_id uuid references public.accounts(id) on delete restrict,
  add column original_principal numeric(20,2)
    check (original_principal is null or original_principal > 0),
  add column interest_rate numeric(7,4)
    check (interest_rate is null or interest_rate between 0 and 100),
  add column emi_amount numeric(20,2)
    check (emi_amount is null or emi_amount > 0),
  add column start_date date,
  add column end_date date,
  add column next_payment_date date,
  add column liability_status text not null default 'active'
    check (liability_status in ('active','paused','closed')),
  add column reminders_enabled boolean not null default true,
  add column reminder_days smallint[] not null default '{7,3,0}'
    check (reminder_days <@ array[0,1,2,3,4,5,6,7,14,30]::smallint[]);

create index accounts_payment_account
  on public.accounts(payment_account_id)
  where payment_account_id is not null;

create or replace function public.assert_account_payment_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_account_id is not null then
    if new.payment_account_id = new.id then
      raise exception 'Payment account must be different from the liability account';
    end if;
    if not exists(
      select 1 from public.accounts
      where id = new.payment_account_id and user_id = new.user_id
    ) then
      raise exception 'Payment account is not owned by current user';
    end if;
  end if;
  return new;
end;
$$;

create trigger accounts_owned_payment_link
before insert or update on public.accounts
for each row execute function public.assert_account_payment_link();

alter table public.notifications
  add column dedupe_key text;

create unique index notifications_user_dedupe
  on public.notifications(user_id, dedupe_key);

-- A refund must point to the owner's original purchase on the same account,
-- and aggregate partial refunds cannot exceed that purchase.
create or replace function public.assert_transaction_refund_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  purchase record;
  already_refunded numeric(20,2);
  destination_type public.account_type;
begin
  if new.type = 'refund' then
    select user_id, account_id, type, amount
    into purchase
    from public.transactions
    where id = new.refund_of_id
    for update;

    if not found then
      raise exception 'Refund must reference an owned purchase on the same account';
    end if;
    if purchase.user_id is distinct from new.user_id or purchase.type <> 'expense' or purchase.account_id <> new.account_id then
      raise exception 'Refund must reference an owned purchase on the same account';
    end if;

    select coalesce(sum(amount), 0)
    into already_refunded
    from public.transactions
    where refund_of_id = new.refund_of_id
      and id <> new.id;

    if already_refunded + new.amount > purchase.amount then
      raise exception 'Refund total cannot exceed the original purchase';
    end if;
  elsif tg_op = 'UPDATE' and old.type = 'expense' and exists(
    select 1 from public.transactions where refund_of_id = old.id
  ) then
    if new.type <> 'expense' or new.account_id <> old.account_id then
      raise exception 'A refunded purchase must remain an expense on its original account';
    end if;
    select coalesce(sum(amount), 0) into already_refunded
    from public.transactions where refund_of_id = old.id;
    if already_refunded > new.amount then
      raise exception 'Purchase amount cannot be lower than its recorded refunds';
    end if;
  end if;

  if new.metadata ? 'loan_principal' or new.metadata ? 'loan_interest' then
    select type into destination_type
    from public.accounts
    where id = new.transfer_account_id and user_id = new.user_id;
    if new.type <> 'transfer' or destination_type is distinct from 'loan'::public.account_type
      or coalesce(new.metadata->>'loan_principal','') !~ '^[0-9]+([.][0-9]{1,2})?$'
      or coalesce(new.metadata->>'loan_interest','') !~ '^[0-9]+([.][0-9]{1,2})?$'
      or (new.metadata->>'loan_principal')::numeric <= 0
      or (new.metadata->>'loan_interest')::numeric < 0
      or (new.metadata->>'loan_principal')::numeric + (new.metadata->>'loan_interest')::numeric <> new.amount
    then
      raise exception 'Loan payment principal and interest must equal the transfer amount';
    end if;
  end if;
  return new;
end;
$$;

create trigger transactions_owned_refund_link
before insert or update on public.transactions
for each row execute function public.assert_transaction_refund_link();

-- Transfers into loans may carry a principal/interest split in the existing
-- transaction metadata. The source account pays the full amount; only the
-- principal portion reduces the loan liability.
create or replace view public.account_balances with (security_invoker = true) as
select a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance + coalesce(sum(
  case
    when t.type='transfer' and t.account_id=a.id then case when a.type in ('credit_card','loan','liability') then t.amount else -t.amount end
    when t.type='transfer' and t.transfer_account_id=a.id then case
      when a.type='loan' and coalesce(t.metadata->>'loan_principal','') ~ '^[0-9]+([.][0-9]{1,2})?$' then -(t.metadata->>'loan_principal')::numeric
      when a.type in ('credit_card','loan','liability') then -t.amount
      else t.amount end
    when t.account_id=a.id and a.type in ('credit_card','loan','liability') and t.type='expense' then t.amount
    when t.account_id=a.id and a.type in ('credit_card','loan','liability') and t.type in ('income','refund') then -t.amount
    when t.account_id=a.id and t.type in ('income','refund') then t.amount
    when t.account_id=a.id and t.type='expense' then -t.amount
    when t.account_id=a.id and t.type='adjustment' then t.amount
    else 0 end
),0)::numeric(20,2) as balance
from public.accounts a left join public.transactions t on (t.account_id=a.id or t.transfer_account_id=a.id)
where a.archived_at is null group by a.id;

create or replace function public.monthly_financial_summary(month_start date default date_trunc('month',current_date)::date)
returns table(income numeric, gross_spending numeric, refunds numeric, net_spending numeric, savings numeric, savings_rate numeric)
language sql stable security invoker set search_path = '' as $$
  with totals as (select
    coalesce(sum(amount) filter(where type='income'),0) income,
    coalesce(sum(amount) filter(where type='expense'),0)
      + coalesce(sum(case when coalesce(metadata->>'loan_interest','') ~ '^[0-9]+([.][0-9]{1,2})?$' then (metadata->>'loan_interest')::numeric else 0 end) filter(where type='transfer'),0) gross,
    coalesce(sum(amount) filter(where type='refund'),0) refunds
  from public.transactions where user_id=auth.uid() and occurred_at >= month_start and occurred_at < month_start + interval '1 month')
  select income,gross,refunds,gross-refunds,income-(gross-refunds),case when income=0 then 0 else round((income-(gross-refunds))*100/income,2) end from totals;
$$;

-- Goal contribution operations and notification delivery still pass through
-- the existing owner-only forced RLS policies.
grant select, insert, update, delete on table public.goal_contributions to authenticated;
grant select, insert, update on table public.notifications to authenticated;
grant select, update on table public.notification_preferences to authenticated;
