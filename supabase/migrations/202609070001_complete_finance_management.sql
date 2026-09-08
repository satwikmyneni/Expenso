-- Forward-only management and reporting. All entry points use the caller's
-- privileges and forced RLS. No auth triggers or existing policies are changed.
alter table public.recurring_transactions add column archived_at timestamptz, add column notes text;

-- Publish newly managed entities without duplicating pre-existing memberships.
do $$ declare entity text; begin
  foreach entity in array array['categories','merchant_rules','goal_contributions','budget_categories','bills','subscriptions','recurring_transactions','imports'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=entity) then
      execute format('alter publication supabase_realtime add table public.%I',entity);
    end if;
  end loop;
end $$;

alter table public.goals
  add column description text,
  add column linked_account_id uuid references public.accounts(id) on delete restrict;

create function public.assert_goal_account_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.linked_account_id is not null and not exists (
    select 1 from public.accounts a where a.id = new.linked_account_id and a.user_id = new.user_id
  ) then raise exception 'Goal account must belong to the goal owner' using errcode = '23514'; end if;
  return new;
end $$;
create trigger goals_owned_account before insert or update on public.goals
for each row execute function public.assert_goal_account_owner();

grant update on public.goals, public.budgets, public.recurring_transactions, public.subscriptions, public.bills to authenticated;
grant delete on public.budget_categories to authenticated;

create index transactions_owner_order on public.transactions(user_id, occurred_at desc, created_at desc, id);
create index transactions_owner_upload on public.transactions(user_id, created_at desc, id);
create index transactions_owner_category_date on public.transactions(user_id, category_id, occurred_at desc);

create function public.search_finance_transactions(filters jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  owner uuid := auth.uid();
  zone text;
  sort_key text := coalesce(filters->>'sort', 'newest');
  size integer := least(greatest(coalesce((filters->>'pageSize')::integer,25),1),100);
  page_number integer := greatest(coalesce((filters->>'page')::integer,0),0);
  answer jsonb;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select p.timezone into zone from public.profiles p where p.id=owner;
  zone := coalesce(zone,'UTC');
  with matching as (
    select t.*, coalesce(i.created_at,t.created_at) as uploaded_at,
      case when jsonb_typeof(t.metadata->'import_row')='number' then (t.metadata->>'import_row')::numeric else 0 end as row_sequence,
      to_char(t.occurred_at at time zone zone,'YYYY-MM-DD') as local_date
    from public.transactions t
    left join public.imports i on i.id=t.import_id and i.user_id=owner
    where t.user_id=owner
      and (nullif(filters->>'account','') is null or t.account_id=(filters->>'account')::uuid or t.transfer_account_id=(filters->>'account')::uuid)
      and (nullif(filters->>'category','') is null or case when filters->>'category'='uncategorized' then t.category_id is null else t.category_id=(filters->>'category')::uuid end)
      and (nullif(filters->>'type','') is null or t.type::text=filters->>'type')
      and (nullif(filters->>'source','') is null or t.source::text=filters->>'source')
      and (nullif(filters->>'id','') is null or t.id=(filters->>'id')::uuid)
      and (nullif(filters->>'importId','') is null or t.import_id=(filters->>'importId')::uuid)
      and (nullif(filters->>'dateFrom','') is null or t.occurred_at >= ((filters->>'dateFrom')::date::timestamp at time zone zone))
      and (nullif(filters->>'dateTo','') is null or t.occurred_at < ((filters->>'dateTo')::date::timestamp at time zone zone))
      and (nullif(filters->>'minAmount','') is null or t.amount >= (filters->>'minAmount')::numeric)
      and (nullif(filters->>'maxAmount','') is null or t.amount <= (filters->>'maxAmount')::numeric)
      and (nullif(filters->>'search','') is null or strpos(lower(concat_ws(' ',t.merchant,t.description,t.notes,t.reference,array_to_string(t.tags,' '))),lower(filters->>'search'))>0)
  ), ordered as (
    select m.*, row_number() over(order by
      case when sort_key='oldest' then occurred_at end asc,
      case when sort_key='newest' then occurred_at end desc,
      case when sort_key='amount_asc' then amount end asc,
      case when sort_key='amount_desc' then amount end desc,
      case when sort_key='uploaded_asc' then uploaded_at end asc,
      case when sort_key='uploaded_desc' then uploaded_at end desc,
      case when sort_key in ('uploaded_asc','uploaded_desc') then row_sequence end asc,
      occurred_at desc, uploaded_at desc, row_sequence asc, id asc
    ) as display_order from matching m
  ), paged as (
    select * from ordered order by display_order limit size offset (page_number::bigint*size)
  )
  select jsonb_build_object('total',(select count(*) from matching),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'display_order'-'row_sequence') || jsonb_build_object('amount',p.amount::text) order by display_order) from paged p),'[]'::jsonb)) into answer;
  return answer;
end $$;

create function public.finance_period_report(date_from date, date_to date, account_filter uuid default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare owner uuid := auth.uid(); zone text; answer jsonb;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if date_from is null or date_to is null or date_to <= date_from then raise exception 'Invalid report period' using errcode='22007'; end if;
  select p.timezone into zone from public.profiles p where p.id=owner;
  zone := coalesce(zone,'UTC');
  with period as (
    select t.*, to_char(t.occurred_at at time zone zone,'YYYY-MM') as month,
      case when t.type='income' then t.amount else 0 end as earned,
      case when t.type='expense' then t.amount when t.type='refund' then -t.amount
        when t.type='transfer' then coalesce((t.metadata->>'loan_interest')::numeric,0) else 0 end as spent
    from public.transactions t where t.user_id=owner
      and t.occurred_at >= (date_from::timestamp at time zone zone)
      and t.occurred_at < (date_to::timestamp at time zone zone)
      and (account_filter is null or t.account_id=account_filter or t.transfer_account_id=account_filter)
  ), categories as (
    select category_id, sum(spent) as amount from period where spent<>0 group by category_id
  ), months as (
    select month,sum(earned) as income,sum(spent) as expenses,count(*) as count from period group by month
  ), days as (
    select to_char(occurred_at at time zone zone,'YYYY-MM-DD') as day,sum(earned) as income,sum(spent) as expenses from period group by 1
  ), budget_totals as (
    select b.id, coalesce(sum(p.spent),0) as spent from public.budgets b
    left join public.budget_categories bc on bc.budget_id=b.id and bc.user_id=owner
    left join period p on p.category_id=bc.category_id
    where b.user_id=owner and b.active group by b.id
  )
  select jsonb_build_object(
    'income',coalesce(sum(earned),0)::text,'expenses',coalesce(sum(spent),0)::text,'count',count(*),
    'transfers',coalesce(sum(amount) filter(where type='transfer'),0)::text,
    'recurring',coalesce(sum(spent) filter(where recurring_transaction_id is not null or source='recurring'),0)::text,
    'subscriptions',coalesce(sum(spent) filter(where subscription_id is not null),0)::text,
    'largest',(select jsonb_build_object('id',id,'merchant',merchant,'amount',amount::text) from period where type='expense' order by amount desc,occurred_at desc,created_at desc,id limit 1),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',category_id,'amount',amount::text) order by amount desc,category_id) from categories),'[]'::jsonb),
    'months',coalesce((select jsonb_agg(jsonb_build_object('month',month,'income',income::text,'expenses',expenses::text,'count',count) order by month) from months),'[]'::jsonb),
    'days',coalesce((select jsonb_agg(jsonb_build_object('day',day,'income',income::text,'expenses',expenses::text) order by day) from days),'[]'::jsonb),
    'budgets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'spent',spent::text)) from budget_totals),'[]'::jsonb)
  ) into answer from period;
  return answer;
end $$;

-- Updating budget fields and its category links is one atomic operation.
create function public.save_budget_details(target_id uuid, details jsonb, category_ids uuid[]) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare owner uuid := auth.uid(); saved_id uuid;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if target_id is null then
    insert into public.budgets(user_id,name,limit_amount,period,alert_threshold,rollover)
    values(owner,details->>'name',(details->>'amount')::numeric,details->>'period',(details->>'threshold')::smallint,coalesce((details->>'rollover')::boolean,false)) returning id into saved_id;
  else
    update public.budgets set name=details->>'name',limit_amount=(details->>'amount')::numeric,period=details->>'period',alert_threshold=(details->>'threshold')::smallint,rollover=coalesce((details->>'rollover')::boolean,false)
    where id=target_id and user_id=owner returning id into saved_id;
    if saved_id is null then raise exception 'Budget unavailable' using errcode='42501'; end if;
    delete from public.budget_categories where budget_id=saved_id and user_id=owner;
  end if;
  insert into public.budget_categories(user_id,budget_id,category_id) select owner,saved_id,unnest(category_ids);
  return saved_id;
end $$;

revoke all on function public.search_finance_transactions(jsonb), public.finance_period_report(date,date,uuid), public.save_budget_details(uuid,jsonb,uuid[]) from public, anon;
grant execute on function public.search_finance_transactions(jsonb), public.finance_period_report(date,date,uuid), public.save_budget_details(uuid,jsonb,uuid[]) to authenticated;
