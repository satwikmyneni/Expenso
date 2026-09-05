-- Expenso auth bootstrap diagnostics
-- Read-only: catalog metadata only. This script does not read auth user rows.

-- A. Every non-internal trigger on auth.users, in execution-name order.
select
  trigger_namespace.nspname as trigger_schema,
  users_table.relname as table_name,
  trigger_row.tgname as trigger_name,
  trigger_row.tgenabled as enabled_mode,
  trigger_row.tgfoid::regprocedure as function_name,
  pg_get_triggerdef(trigger_row.oid, true) as trigger_definition
from pg_trigger as trigger_row
join pg_class as users_table on users_table.oid = trigger_row.tgrelid
join pg_namespace as trigger_namespace on trigger_namespace.oid = users_table.relnamespace
where trigger_row.tgrelid = 'auth.users'::regclass
  and not trigger_row.tgisinternal
order by trigger_row.tgname;

-- B. Definitions and execution context of functions called by auth.users or
--    by tables populated during the Expenso bootstrap.
with relevant_tables(qualified_name) as (
  values
    ('auth.users'),
    ('public.profiles'),
    ('public.notification_preferences'),
    ('public.dashboard_preferences'),
    ('public.ai_settings'),
    ('public.categories'),
    ('public.accounts')
), trigger_functions as (
  select distinct trigger_row.tgfoid
  from relevant_tables
  cross join lateral to_regclass(relevant_tables.qualified_name) as resolved(table_oid)
  join pg_trigger as trigger_row on trigger_row.tgrelid = resolved.table_oid
  where not trigger_row.tgisinternal
)
select
  function_namespace.nspname as function_schema,
  function_row.proname as function_name,
  pg_get_function_identity_arguments(function_row.oid) as identity_arguments,
  pg_get_userbyid(function_row.proowner) as function_owner,
  owner_role.rolbypassrls as owner_bypasses_rls,
  function_row.prosecdef as security_definer,
  function_row.proconfig as function_settings,
  pg_get_functiondef(function_row.oid) as function_definition
from trigger_functions
join pg_proc as function_row on function_row.oid = trigger_functions.tgfoid
join pg_namespace as function_namespace on function_namespace.oid = function_row.pronamespace
join pg_roles as owner_role on owner_role.oid = function_row.proowner
order by function_namespace.nspname, function_row.proname;

-- B2. Trigger chain on every table touched by handle_new_user(), plus accounts.
with relevant_tables(qualified_name) as (
  values
    ('public.profiles'),
    ('public.notification_preferences'),
    ('public.dashboard_preferences'),
    ('public.ai_settings'),
    ('public.categories'),
    ('public.accounts')
)
select
  relevant_tables.qualified_name as table_name,
  trigger_row.tgname as trigger_name,
  trigger_row.tgenabled as enabled_mode,
  trigger_row.tgfoid::regprocedure as function_name,
  pg_get_triggerdef(trigger_row.oid, true) as trigger_definition
from relevant_tables
cross join lateral to_regclass(relevant_tables.qualified_name) as resolved(table_oid)
left join pg_trigger as trigger_row
  on trigger_row.tgrelid = resolved.table_oid
 and not trigger_row.tgisinternal
order by relevant_tables.qualified_name, trigger_row.tgname;

-- C. Required bootstrap tables. A null regclass means the table is missing.
with expected_tables(qualified_name) as (
  values
    ('public.profiles'),
    ('public.notification_preferences'),
    ('public.dashboard_preferences'),
    ('public.ai_settings'),
    ('public.categories'),
    ('public.accounts')
)
select
  qualified_name,
  to_regclass(qualified_name) as resolved_table
from expected_tables
order by qualified_name;

-- C2. Actual columns, types, nullability, and defaults on bootstrap tables.
select
  columns.table_schema,
  columns.table_name,
  columns.ordinal_position,
  columns.column_name,
  columns.data_type,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default
from information_schema.columns as columns
where columns.table_schema = 'public'
  and columns.table_name in (
    'profiles',
    'notification_preferences',
    'dashboard_preferences',
    'ai_settings',
    'categories',
    'accounts'
  )
order by columns.table_name, columns.ordinal_position;

-- C3. Columns directly referenced by the repository's handle_new_user().
--     Any MISSING result identifies concrete live-schema drift.
with expected_columns(table_name, column_name) as (
  values
    ('profiles', 'id'),
    ('profiles', 'display_name'),
    ('notification_preferences', 'user_id'),
    ('dashboard_preferences', 'user_id'),
    ('ai_settings', 'user_id'),
    ('categories', 'user_id'),
    ('categories', 'name'),
    ('categories', 'icon'),
    ('categories', 'color'),
    ('categories', 'kind'),
    ('categories', 'is_default'),
    ('categories', 'sort_order')
)
select
  expected_columns.table_name,
  expected_columns.column_name,
  case when columns.column_name is null then 'MISSING' else 'present' end as status
from expected_columns
left join information_schema.columns as columns
  on columns.table_schema = 'public'
 and columns.table_name = expected_columns.table_name
 and columns.column_name = expected_columns.column_name
order by expected_columns.table_name, expected_columns.column_name;

-- D. Primary keys, unique/check constraints, and foreign keys on bootstrap tables.
select
  constraint_namespace.nspname as table_schema,
  table_row.relname as table_name,
  constraint_row.conname as constraint_name,
  constraint_row.contype as constraint_type,
  pg_get_constraintdef(constraint_row.oid, true) as constraint_definition
from pg_constraint as constraint_row
join pg_class as table_row on table_row.oid = constraint_row.conrelid
join pg_namespace as constraint_namespace on constraint_namespace.oid = table_row.relnamespace
where constraint_row.conrelid in (
  to_regclass('public.profiles'),
  to_regclass('public.notification_preferences'),
  to_regclass('public.dashboard_preferences'),
  to_regclass('public.ai_settings'),
  to_regclass('public.categories'),
  to_regclass('public.accounts')
)
order by constraint_namespace.nspname, table_row.relname, constraint_row.contype, constraint_row.conname;

-- E. Every foreign key whose source or target is auth.users.
select
  source_namespace.nspname as source_schema,
  source_table.relname as source_table,
  constraint_row.conname as constraint_name,
  target_namespace.nspname as target_schema,
  target_table.relname as target_table,
  pg_get_constraintdef(constraint_row.oid, true) as constraint_definition
from pg_constraint as constraint_row
join pg_class as source_table on source_table.oid = constraint_row.conrelid
join pg_namespace as source_namespace on source_namespace.oid = source_table.relnamespace
join pg_class as target_table on target_table.oid = constraint_row.confrelid
join pg_namespace as target_namespace on target_namespace.oid = target_table.relnamespace
where constraint_row.contype = 'f'
  and (
    constraint_row.conrelid = 'auth.users'::regclass
    or constraint_row.confrelid = 'auth.users'::regclass
  )
order by source_namespace.nspname, source_table.relname, constraint_row.conname;

-- F. RLS state and ownership for bootstrap tables.
select
  table_namespace.nspname as table_schema,
  table_row.relname as table_name,
  pg_get_userbyid(table_row.relowner) as table_owner,
  owner_role.rolbypassrls as owner_bypasses_rls,
  table_row.relrowsecurity as rls_enabled,
  table_row.relforcerowsecurity as rls_forced
from pg_class as table_row
join pg_namespace as table_namespace on table_namespace.oid = table_row.relnamespace
join pg_roles as owner_role on owner_role.oid = table_row.relowner
where table_row.oid in (
  to_regclass('public.profiles'),
  to_regclass('public.notification_preferences'),
  to_regclass('public.dashboard_preferences'),
  to_regclass('public.ai_settings'),
  to_regclass('public.categories'),
  to_regclass('public.accounts')
)
order by table_namespace.nspname, table_row.relname;

-- F2. Policies on bootstrap tables. These expressions should remain owner-only.
select
  policies.schemaname,
  policies.tablename,
  policies.policyname,
  policies.permissive,
  policies.roles,
  policies.cmd,
  policies.qual,
  policies.with_check
from pg_policies as policies
where policies.schemaname = 'public'
  and policies.tablename in (
    'profiles',
    'notification_preferences',
    'dashboard_preferences',
    'ai_settings',
    'categories',
    'accounts'
  )
order by policies.tablename, policies.policyname;

-- G. Repository-vs-live migration history. The repository currently contains
--    only version 202609030001. If the live row exists but its SQL was edited
--    later in the repository, the migration version alone will not repair drift.
select *
from supabase_migrations.schema_migrations
order by version;
