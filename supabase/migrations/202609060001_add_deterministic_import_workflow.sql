-- Wire the existing import, merchant-rule, attachment, and private-storage
-- model into the browser application without changing its ownership boundary.
-- All tables below already use forced owner-only RLS.

alter table public.imports
  add column source_kind text not null default 'statement'
    check (source_kind in ('statement', 'receipt_ocr')),
  add column duplicate_rows integer not null default 0
    check (duplicate_rows >= 0),
  add column failed_rows integer not null default 0
    check (failed_rows >= 0);

alter table public.merchant_rules
  add column merchant_normalized text;

update public.merchant_rules
set merchant_normalized = trim(regexp_replace(lower(pattern), '[^a-z0-9]+', ' ', 'g'))
where merchant_normalized is null;

alter table public.merchant_rules
  alter column merchant_normalized set not null;

create index imports_user_created_at
  on public.imports(user_id, created_at desc);
create index imports_user_file_hash
  on public.imports(user_id, file_hash)
  where file_hash is not null;
create index merchant_rules_user_normalized
  on public.merchant_rules(user_id, merchant_normalized, priority desc)
  where enabled;
create index transactions_duplicate_lookup
  on public.transactions(user_id, account_id, occurred_at, amount);
create index transactions_reference_lookup
  on public.transactions(user_id, reference)
  where reference is not null;

-- Uncategorized is a user-owned system category. A profile trigger avoids
-- replacing or editing the carefully audited auth.users bootstrap function.
create or replace function public.ensure_uncategorized_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories(user_id, name, icon, color, kind, is_default, sort_order)
  values(new.id, 'Uncategorized', 'CircleHelp', '#7b8794', 'both', true, 1000)
  on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_uncategorized
after insert on public.profiles
for each row execute function public.ensure_uncategorized_category();

insert into public.categories(user_id, name, icon, color, kind, is_default, sort_order)
select profile.id, 'Uncategorized', 'CircleHelp', '#7b8794', 'both', true, 1000
from public.profiles as profile
where not exists(
  select 1 from public.categories as category
  where category.user_id = profile.id
    and lower(category.name) = 'uncategorized'
)
on conflict do nothing;

create or replace function public.protect_uncategorized_category()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if lower(old.name) = 'uncategorized' and old.is_default then
    if tg_op = 'DELETE' then
      raise exception 'Uncategorized is a protected system category';
    end if;
    if new.archived_at is not null
      or lower(new.name) <> 'uncategorized'
      or not new.is_default then
      raise exception 'Uncategorized is a protected system category';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger categories_protect_uncategorized
before update or delete on public.categories
for each row execute function public.protect_uncategorized_category();

-- Archive a custom category without deleting history. Existing categorized
-- transactions move to the owner's protected Uncategorized category.
create or replace function public.archive_category_safely(target_category_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_is_default boolean;
  fallback_category_id uuid;
begin
  select category.is_default
  into target_is_default
  from public.categories as category
  where category.id = target_category_id
    and category.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Category was not found';
  end if;
  if target_is_default then
    raise exception 'Default categories cannot be archived';
  end if;

  select category.id
  into fallback_category_id
  from public.categories as category
  where category.user_id = auth.uid()
    and lower(category.name) = 'uncategorized'
    and category.archived_at is null
  order by category.created_at
  limit 1;

  if fallback_category_id is null then
    raise exception 'Uncategorized category is unavailable';
  end if;

  update public.transactions
  set category_id = fallback_category_id
  where user_id = auth.uid() and category_id = target_category_id;

  update public.merchant_rules
  set category_id = fallback_category_id, enabled = false
  where user_id = auth.uid() and category_id = target_category_id;

  -- Preserve active subcategories by promoting them to the top level before
  -- their parent is archived. Their transactions and identities are untouched.
  update public.categories
  set parent_id = null
  where user_id = auth.uid() and parent_id = target_category_id;

  update public.categories
  set archived_at = timezone('utc', now())
  where id = target_category_id and user_id = auth.uid();
end;
$$;

revoke all on function public.archive_category_safely(uuid) from public;
grant execute on function public.archive_category_safely(uuid) to authenticated;

-- Table privileges only let PostgREST reach the existing owner-only policies.
grant select, insert, update on table public.imports to authenticated;
grant select, insert, update, delete on table public.import_rows to authenticated;
grant select, insert, update, delete on table public.merchant_rules to authenticated;
grant select, insert, update, delete on table public.attachments to authenticated;
