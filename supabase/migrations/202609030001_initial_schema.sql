-- Expenso initial schema. Monetary values use exact NUMERIC(20,2), never floats.
create extension if not exists pgcrypto;

create type public.account_type as enum ('bank','savings','cash','credit_card','loan','investment','wallet','asset','liability');
create type public.transaction_type as enum ('expense','income','transfer','refund','adjustment');
create type public.transaction_source as enum ('manual','voice','csv','xlsx','pdf','ocr','recurring');
create type public.frequency_type as enum ('daily','weekly','monthly','quarterly','yearly','custom');
create type public.import_status as enum ('uploaded','parsing','review','imported','failed','cancelled');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

-- For authenticated requests, ownership is derived from auth.uid and overwrites client input.
create or replace function public.enforce_row_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then new.user_id = auth.uid(); end if;
  if new.user_id is null then raise exception 'An authenticated owner is required'; end if;
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  avatar_path text,
  currency char(3) not null default 'INR',
  locale text not null default 'en-IN',
  timezone text not null default 'Asia/Kolkata',
  date_format text not null default 'dd/MM/yyyy',
  first_day_of_week smallint not null default 1 check (first_day_of_week between 0 and 6),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100), type public.account_type not null, institution text,
  currency char(3) not null default 'INR', opening_balance numeric(20,2) not null default 0, color text not null default '#195848',
  last_four text check (last_four is null or last_four ~ '^\d{4}$'), include_in_net_worth boolean not null default true,
  include_in_analytics boolean not null default true, archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete restrict, name text not null check (char_length(name) between 1 and 80),
  icon text not null default 'Circle', color text not null default '#668d86', kind text not null check (kind in ('expense','income','both')),
  is_default boolean not null default false, sort_order integer not null default 0, archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create unique index categories_unique_name on public.categories(user_id, lower(name), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'));

create table public.imports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete restrict, file_name text not null, file_path text, file_type text not null,
  file_hash text, status public.import_status not null default 'uploaded', total_rows integer not null default 0,
  imported_rows integer not null default 0, skipped_rows integer not null default 0, error_message text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict, category_id uuid references public.categories(id) on delete restrict,
  title text not null, merchant text, amount numeric(20,2) not null check (amount > 0), currency char(3) not null default 'INR',
  type text not null check (type in ('expense','income')), frequency public.frequency_type not null, interval_count integer not null default 1 check(interval_count > 0),
  custom_rule jsonb, start_date date not null, next_date date not null, end_date date, active boolean not null default true,
  auto_create boolean not null default false, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete restrict, category_id uuid references public.categories(id) on delete restrict,
  merchant text not null, title text not null, estimated_amount numeric(20,2) not null check(estimated_amount > 0), currency char(3) not null default 'INR',
  frequency public.frequency_type not null default 'monthly', last_payment_date date, next_expected_date date, confidence numeric(5,2) check(confidence between 0 and 100),
  status text not null default 'detected' check(status in ('detected','active','dismissed','cancelled')),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict, transfer_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict, type public.transaction_type not null,
  amount numeric(20,2) not null check (amount > 0), currency char(3) not null default 'INR', occurred_at timestamptz not null,
  merchant text not null default '', description text, notes text, payment_method text, tags text[] not null default '{}',
  source public.transaction_source not null default 'manual', reference text, import_id uuid references public.imports(id) on delete set null,
  recurring_transaction_id uuid references public.recurring_transactions(id) on delete set null, subscription_id uuid references public.subscriptions(id) on delete set null,
  refund_of_id uuid references public.transactions(id) on delete restrict, duplicate_of_id uuid references public.transactions(id) on delete set null,
  review_status text not null default 'confirmed' check(review_status in ('confirmed','needs_review','ignored','duplicate')),
  metadata jsonb not null default '{}', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  constraint valid_transfer check ((type = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id) or (type <> 'transfer' and transfer_account_id is null)),
  constraint valid_refund check ((type = 'refund' and refund_of_id is not null) or type <> 'refund')
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  import_id uuid not null references public.imports(id) on delete cascade, row_number integer not null, raw_data jsonb not null,
  normalized_data jsonb, status text not null default 'pending' check(status in ('pending','ready','needs_review','imported','ignored','failed')),
  issue_codes text[] not null default '{}', duplicate_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), unique(import_id,row_number)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, color text, created_at timestamptz not null default timezone('utc', now()), unique(user_id,name)
);
create table public.transaction_tags (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade, tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key(transaction_id,tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade, storage_path text not null, file_name text not null,
  content_type text not null, size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 10485760), checksum text, ocr_status text not null default 'not_requested', ocr_result jsonb,
  created_at timestamptz not null default timezone('utc', now()), unique(user_id,storage_path)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, limit_amount numeric(20,2) not null check(limit_amount > 0), period text not null check(period in ('weekly','monthly','yearly')),
  start_date date not null default current_date, alert_threshold smallint not null default 80 check(alert_threshold between 1 and 100),
  rollover boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.budget_categories (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade, category_id uuid not null references public.categories(id) on delete restrict,
  primary key(budget_id,category_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, target_amount numeric(20,2) not null check(target_amount > 0), current_amount numeric(20,2) not null default 0 check(current_amount >= 0),
  target_date date, color text not null default '#195848', icon text not null default 'Target', status text not null default 'active' check(status in ('active','completed','paused','archived')),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade, amount numeric(20,2) not null check(amount <> 0), contributed_at timestamptz not null default timezone('utc', now()), notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.bills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete restrict, category_id uuid references public.categories(id) on delete restrict,
  title text not null, amount numeric(20,2) check(amount > 0), currency char(3) not null default 'INR', due_date date not null,
  frequency public.frequency_type, reminder_days smallint[] not null default '{3,1}', notes text,
  status text not null default 'upcoming' check(status in ('upcoming','paid','overdue','dismissed')),
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern text not null, match_type text not null default 'contains' check(match_type in ('exact','contains','regex')),
  category_id uuid references public.categories(id) on delete restrict, account_id uuid references public.accounts(id) on delete cascade,
  transaction_type public.transaction_type, priority integer not null default 0, enabled boolean not null default true, application_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.saved_filters (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, filters jsonb not null, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null, title text not null, body text not null, action_url text, read_at timestamptz, created_at timestamptz not null default timezone('utc', now())
);
create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  bills boolean not null default true, budgets boolean not null default true, recurring boolean not null default true,
  subscriptions boolean not null default true, goals boolean not null default true, imports boolean not null default true,
  push_enabled boolean not null default false, email_enabled boolean not null default true, quiet_hours jsonb not null default '{}', updated_at timestamptz not null default timezone('utc', now())
);
create table public.dashboard_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  widgets jsonb not null default '["net_worth","monthly_spending","cash_flow","recent_transactions","budgets","goals"]', default_period text not null default 'month', updated_at timestamptz not null default timezone('utc', now())
);
create table public.ai_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled boolean not null default false, provider text not null default 'disabled' check(provider in ('disabled','ollama','openai_compatible')),
  endpoint text, model text, allow_transaction_context boolean not null default false, updated_at timestamptz not null default timezone('utc', now())
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}', ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Ownership and parent-integrity checks prevent linking a user's row to another user's IDs.
create or replace function public.assert_owned_foreign_keys() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  if tg_table_name = 'transactions' then
    select user_id into owner from public.accounts where id = new.account_id;
    if owner is distinct from new.user_id then raise exception 'Account is not owned by current user'; end if;
    if new.transfer_account_id is not null and not exists(select 1 from public.accounts where id=new.transfer_account_id and user_id=new.user_id) then raise exception 'Transfer account is not owned by current user'; end if;
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Category is not owned by current user'; end if;
  elsif tg_table_name = 'categories' and new.parent_id is not null then
    if not exists(select 1 from public.categories where id=new.parent_id and user_id=new.user_id) then raise exception 'Parent category is not owned by current user'; end if;
  elsif tg_table_name = 'imports' and new.account_id is not null then
    if not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id) then raise exception 'Account is not owned by current user'; end if;
  elsif tg_table_name = 'recurring_transactions' then
    if not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id) then raise exception 'Account is not owned by current user'; end if;
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Category is not owned by current user'; end if;
  elsif tg_table_name = 'subscriptions' then
    if new.account_id is not null and not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id) then raise exception 'Account is not owned by current user'; end if;
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Category is not owned by current user'; end if;
  elsif tg_table_name = 'import_rows' then
    if not exists(select 1 from public.imports where id=new.import_id and user_id=new.user_id) then raise exception 'Import is not owned by current user'; end if;
  elsif tg_table_name = 'transaction_tags' then
    if not exists(select 1 from public.transactions where id=new.transaction_id and user_id=new.user_id) or not exists(select 1 from public.tags where id=new.tag_id and user_id=new.user_id) then raise exception 'Transaction and tag must be owned by current user'; end if;
  elsif tg_table_name = 'attachments' and new.transaction_id is not null then
    if not exists(select 1 from public.transactions where id=new.transaction_id and user_id=new.user_id) then raise exception 'Transaction is not owned by current user'; end if;
  elsif tg_table_name = 'budget_categories' then
    if not exists(select 1 from public.budgets where id=new.budget_id and user_id=new.user_id) or not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Budget and category must be owned by current user'; end if;
  elsif tg_table_name = 'goal_contributions' then
    if not exists(select 1 from public.goals where id=new.goal_id and user_id=new.user_id) then raise exception 'Goal is not owned by current user'; end if;
  elsif tg_table_name = 'bills' then
    if new.account_id is not null and not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id) then raise exception 'Account is not owned by current user'; end if;
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Category is not owned by current user'; end if;
  elsif tg_table_name = 'merchant_rules' then
    if new.account_id is not null and not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id) then raise exception 'Account is not owned by current user'; end if;
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id) then raise exception 'Category is not owned by current user'; end if;
  end if;
  return new;
end;
$$;

-- Enable RLS and create identical owner policies for all user_id-owned tables.
do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','categories','imports','recurring_transactions','subscriptions','transactions','import_rows','tags','transaction_tags','attachments','budgets','budget_categories','goals','goal_contributions','bills','merchant_rules','saved_filters','notifications','notification_preferences','dashboard_preferences','ai_settings','audit_logs'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', table_name || '_delete_own', table_name);
  end loop;
end $$;

alter table public.profiles enable row level security; alter table public.profiles force row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = (select auth.uid()));

do $$ declare table_name text; begin
  foreach table_name in array array['accounts','categories','imports','recurring_transactions','subscriptions','transactions','import_rows','tags','transaction_tags','attachments','budgets','budget_categories','goals','goal_contributions','bills','merchant_rules','saved_filters','notifications','notification_preferences','dashboard_preferences','ai_settings','audit_logs'] loop
    execute format('create trigger enforce_owner before insert on public.%I for each row execute function public.enforce_row_owner()', table_name);
  end loop;
end $$;
create trigger transactions_owned_fks before insert or update on public.transactions for each row execute function public.assert_owned_foreign_keys();
do $$ declare table_name text; begin
  foreach table_name in array array['categories','imports','recurring_transactions','subscriptions','import_rows','transaction_tags','attachments','budget_categories','goal_contributions','bills','merchant_rules'] loop
    execute format('create trigger owned_foreign_keys before insert or update on public.%I for each row execute function public.assert_owned_foreign_keys()', table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['profiles','accounts','categories','imports','recurring_transactions','subscriptions','transactions','import_rows','budgets','goals','bills','merchant_rules','saved_filters'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name);
  end loop;
end $$;

create index transactions_user_date on public.transactions(user_id, occurred_at desc);
create index transactions_user_account on public.transactions(user_id, account_id, occurred_at desc);
create index transactions_user_category on public.transactions(user_id, category_id, occurred_at desc);
create index transactions_user_type on public.transactions(user_id, type, occurred_at desc);
create index transactions_merchant_search on public.transactions(user_id, lower(merchant));
create index transactions_import on public.transactions(import_id) where import_id is not null;
create index transactions_recurring on public.transactions(recurring_transaction_id) where recurring_transaction_id is not null;
create index bills_user_due on public.bills(user_id,due_date) where status in ('upcoming','overdue');
create index notifications_unread on public.notifications(user_id,created_at desc) where read_at is null;

-- Security-invoker view applies the caller's RLS policies.
create view public.account_balances with (security_invoker = true) as
select a.id, a.user_id, a.name, a.type, a.currency, a.opening_balance + coalesce(sum(
  case
    when t.type='transfer' and t.account_id=a.id then case when a.type in ('credit_card','loan','liability') then t.amount else -t.amount end
    when t.type='transfer' and t.transfer_account_id=a.id then case when a.type in ('credit_card','loan','liability') then -t.amount else t.amount end
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
    coalesce(sum(amount) filter(where type='expense'),0) gross,
    coalesce(sum(amount) filter(where type='refund'),0) refunds
  from public.transactions where user_id=auth.uid() and occurred_at >= month_start and occurred_at < month_start + interval '1 month')
  select income,gross,refunds,gross-refunds,income-(gross-refunds),case when income=0 then 0 else round((income-(gross-refunds))*100/income,2) end from totals;
$$;
grant select on public.account_balances to authenticated;
grant execute on function public.monthly_financial_summary(date) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)));
  insert into public.notification_preferences(user_id) values(new.id);
  insert into public.dashboard_preferences(user_id) values(new.id);
  insert into public.ai_settings(user_id) values(new.id);
  insert into public.categories(user_id,name,icon,color,kind,is_default,sort_order) values
    (new.id,'Food & dining','Utensils','#dc765b','expense',true,10),(new.id,'Transport','Car','#668d86','expense',true,20),
    (new.id,'Housing','House','#887861','expense',true,30),(new.id,'Shopping','ShoppingBag','#9b7cad','expense',true,40),
    (new.id,'Health','HeartPulse','#c46773','expense',true,50),(new.id,'Bills & utilities','Zap','#d3a54e','expense',true,60),
    (new.id,'Entertainment','Clapperboard','#718eb8','expense',true,70),(new.id,'Travel','Plane','#4c8fa4','expense',true,80),
    (new.id,'Income','Landmark','#3e906e','income',true,90);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('receipts','receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy receipts_select_own on storage.objects for select to authenticated using(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy receipts_insert_own on storage.objects for insert to authenticated with check(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy receipts_update_own on storage.objects for update to authenticated using(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy receipts_delete_own on storage.objects for delete to authenticated using(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);

alter publication supabase_realtime add table public.transactions, public.accounts, public.budgets, public.goals, public.notifications;
