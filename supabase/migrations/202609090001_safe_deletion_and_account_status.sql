-- One top-level statement: compatible with Supabase extended-protocol pipelines
-- and runners that already wrap migrations in a transaction. The PL/pgSQL BEGIN
-- below is a block delimiter, not BEGIN TRANSACTION. No COMMIT/ROLLBACK is issued.
-- The category lock, temporary trigger suspension, normalization, unique index,
-- and all remaining schema changes succeed or roll back together.
do $migration$
begin
-- Forward-only management changes. All mutations retain forced RLS.
alter table public.accounts add column if not exists is_active boolean not null default true;
grant update (is_active) on public.accounts to authenticated;
grant delete on public.categories, public.goals to authenticated;

-- Normalize legacy fallback duplicates without losing any financial records.
-- The migration holds the table lock until normalization and protection finish.
lock table public.categories in access exclusive mode;
alter table public.categories disable trigger categories_protect_uncategorized;
do $$
declare owner_id uuid; fallback uuid; duplicate_id uuid; table_name text;
begin
  for owner_id in select id from public.profiles loop
    select id into fallback from public.categories
      where user_id=owner_id and lower(name)='uncategorized'
      order by (parent_id is null) desc, created_at, id limit 1;
    if fallback is null then
      insert into public.categories(user_id,name,kind,icon,color,is_default)
        values(owner_id,'Uncategorized','both','CircleHelp','#7b8794',true) returning id into fallback;
    end if;
    for duplicate_id in select id from public.categories where user_id=owner_id and lower(name)='uncategorized' and id<>fallback loop
      foreach table_name in array array['transactions','recurring_transactions','subscriptions','bills','merchant_rules'] loop
        execute format('update public.%I set category_id=$1 where user_id=$2 and category_id=$3',table_name) using fallback,owner_id,duplicate_id;
      end loop;
      insert into public.budget_categories(user_id,budget_id,category_id)
        select user_id,budget_id,fallback from public.budget_categories where category_id=duplicate_id on conflict do nothing;
      delete from public.budget_categories where category_id=duplicate_id;
      update public.categories set parent_id=null where parent_id=duplicate_id;
      delete from public.categories where id=duplicate_id;
    end loop;
    update public.categories set name='Uncategorized',kind='both',is_default=true,archived_at=null,parent_id=null where id=fallback;
  end loop;
end $$;
alter table public.categories enable trigger categories_protect_uncategorized;
create unique index if not exists categories_one_uncategorized on public.categories(user_id) where lower(name)='uncategorized';

create or replace function public.protect_uncategorized_category() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if lower(old.name)='uncategorized' then
    if tg_op='DELETE' then raise exception 'Uncategorized is a protected system category'; end if;
    if new.name<>'Uncategorized' or not new.is_default or new.archived_at is not null or new.parent_id is not null or new.kind<>'both' then
      raise exception 'Uncategorized is a protected system category';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.delete_category_safely(target_category_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); fallback uuid; affected uuid[]; table_name text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  -- Serialize hierarchy deletion and fallback creation per owner.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  perform 1 from public.categories where id=target_category_id and user_id=owner_id for update;
  if not found then raise exception 'Category was not found'; end if;
  with recursive subtree as (
    select id from public.categories where id=target_category_id and user_id=owner_id
    union select c.id from public.categories c join subtree s on c.parent_id=s.id where c.user_id=owner_id
  ) select array_agg(id) into affected from subtree;
  if exists(select 1 from public.categories where id=any(affected) and lower(name)='uncategorized') then
    raise exception 'Uncategorized is a protected system category';
  end if;
  perform 1 from public.categories where id=any(affected) for update;
  insert into public.categories(user_id,name,kind,icon,color,is_default)
    values(owner_id,'Uncategorized','both','CircleHelp','#7b8794',true) on conflict do nothing;
  select id into fallback from public.categories where user_id=owner_id and lower(name)='uncategorized';
  update public.categories set is_default=true,kind='both',archived_at=null,parent_id=null where id=fallback;
  foreach table_name in array array['transactions','recurring_transactions','subscriptions','bills'] loop
    execute format('update public.%I set category_id=$1 where user_id=$2 and category_id=any($3)',table_name) using fallback,owner_id,affected;
  end loop;
  delete from public.merchant_rules where user_id=owner_id and category_id=any(affected);
  insert into public.budget_categories(user_id,budget_id,category_id)
    select distinct user_id,budget_id,fallback from public.budget_categories where user_id=owner_id and category_id=any(affected) on conflict do nothing;
  delete from public.budget_categories where user_id=owner_id and category_id=any(affected);
  -- Delete leaves first. Promoting descendants can collide with an existing
  -- top-level category of the same name under the unique hierarchy index.
  while exists(select 1 from public.categories where user_id=owner_id and id=any(affected)) loop
    delete from public.categories c where c.user_id=owner_id and c.id=any(affected)
      and not exists(select 1 from public.categories child where child.parent_id=c.id);
    if not found then raise exception 'Category hierarchy contains a cycle'; end if;
  end loop;
end $$;

create or replace function public.delete_goal_safely(target_goal_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.goals where id=target_goal_id and user_id=auth.uid() for update;
  if not found then raise exception 'Goal was not found'; end if;
  -- The FK points FROM contributions TO transactions. Removing allocations
  -- unlinks those relationships and cannot delete a financial transaction.
  delete from public.goal_contributions where goal_id=target_goal_id and user_id=auth.uid();
  delete from public.goals where id=target_goal_id and user_id=auth.uid();
end $$;
revoke all on function public.delete_category_safely(uuid), public.delete_goal_safely(uuid) from public, anon;
grant execute on function public.delete_category_safely(uuid), public.delete_goal_safely(uuid) to authenticated;

-- Daily totals cover all matching rows, including dates spanning pages.
create or replace function public.search_finance_transactions(filters jsonb default '{}') returns jsonb
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
    'daily_totals',coalesce((select jsonb_object_agg(local_date,net::text) from (
      select local_date,sum(case when type in ('income','refund') then amount when type='expense' then -amount
        when type='transfer' then -coalesce((metadata->>'loan_interest')::numeric,0) else 0 end) net
      from matching where local_date in (select local_date from paged) group by local_date) d),'{}'::jsonb),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'display_order'-'row_sequence') || jsonb_build_object('amount',p.amount::text) order by display_order) from paged p),'[]'::jsonb)) into answer;
  return answer;
end $$;


-- Inactive accounts retain historical edits; new account references require reactivation.
create or replace function public.check_transaction_account_active() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' or new.account_id is distinct from old.account_id then
    if exists(select 1 from public.accounts where id=new.account_id and user_id=auth.uid() and not is_active) then
      raise exception 'Reactivate this account before adding transactions';
    end if;
  end if;
  if tg_op='INSERT' or new.transfer_account_id is distinct from old.transfer_account_id then
    if exists(select 1 from public.accounts where id=new.transfer_account_id and user_id=auth.uid() and not is_active) then
      raise exception 'Reactivate the destination account before adding transactions';
    end if;
  end if;
  return new;
end $$;
create or replace trigger transactions_active_account before insert or update on public.transactions
for each row execute function public.check_transaction_account_active();

-- Progress status follows deterministic saved/target amounts, including edits.
create or replace function public.sync_goal_completion() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status not in ('archived','paused') then
    new.status:=case when new.current_amount>=new.target_amount then 'completed' else 'active' end;
  end if;
  return new;
end $$;
create or replace trigger goals_completion before insert or update on public.goals
for each row execute function public.sync_goal_completion();
update public.goals set status=case when current_amount>=target_amount then 'completed' else 'active' end
where status not in ('archived','paused');

end;
$migration$;
