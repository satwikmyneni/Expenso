-- Keep table dispatch separate from row-field checks. A trigger NEW record only
-- exposes columns from the table that fired the trigger.
create or replace function public.assert_owned_foreign_keys()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  if tg_table_name = 'transactions' then
    select user_id into owner from public.accounts where id = new.account_id;
    if owner is distinct from new.user_id then
      raise exception 'Account is not owned by current user';
    end if;
    if new.transfer_account_id is not null and not exists(
      select 1 from public.accounts where id = new.transfer_account_id and user_id = new.user_id
    ) then
      raise exception 'Transfer account is not owned by current user';
    end if;
    if new.category_id is not null and not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Category is not owned by current user';
    end if;
  elsif tg_table_name = 'categories' then
    if new.parent_id is not null and not exists(
      select 1 from public.categories where id = new.parent_id and user_id = new.user_id
    ) then
      raise exception 'Parent category is not owned by current user';
    end if;
  elsif tg_table_name = 'imports' then
    if new.account_id is not null and not exists(
      select 1 from public.accounts where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account is not owned by current user';
    end if;
  elsif tg_table_name = 'recurring_transactions' then
    if not exists(
      select 1 from public.accounts where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account is not owned by current user';
    end if;
    if new.category_id is not null and not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Category is not owned by current user';
    end if;
  elsif tg_table_name = 'subscriptions' then
    if new.account_id is not null and not exists(
      select 1 from public.accounts where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account is not owned by current user';
    end if;
    if new.category_id is not null and not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Category is not owned by current user';
    end if;
  elsif tg_table_name = 'import_rows' then
    if not exists(
      select 1 from public.imports where id = new.import_id and user_id = new.user_id
    ) then
      raise exception 'Import is not owned by current user';
    end if;
  elsif tg_table_name = 'transaction_tags' then
    if not exists(
      select 1 from public.transactions where id = new.transaction_id and user_id = new.user_id
    ) or not exists(
      select 1 from public.tags where id = new.tag_id and user_id = new.user_id
    ) then
      raise exception 'Transaction and tag must be owned by current user';
    end if;
  elsif tg_table_name = 'attachments' then
    if new.transaction_id is not null and not exists(
      select 1 from public.transactions where id = new.transaction_id and user_id = new.user_id
    ) then
      raise exception 'Transaction is not owned by current user';
    end if;
  elsif tg_table_name = 'budget_categories' then
    if not exists(
      select 1 from public.budgets where id = new.budget_id and user_id = new.user_id
    ) or not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Budget and category must be owned by current user';
    end if;
  elsif tg_table_name = 'goal_contributions' then
    if not exists(
      select 1 from public.goals where id = new.goal_id and user_id = new.user_id
    ) then
      raise exception 'Goal is not owned by current user';
    end if;
  elsif tg_table_name = 'bills' then
    if new.account_id is not null and not exists(
      select 1 from public.accounts where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account is not owned by current user';
    end if;
    if new.category_id is not null and not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Category is not owned by current user';
    end if;
  elsif tg_table_name = 'merchant_rules' then
    if new.account_id is not null and not exists(
      select 1 from public.accounts where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account is not owned by current user';
    end if;
    if new.category_id is not null and not exists(
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Category is not owned by current user';
    end if;
  end if;

  return new;
end;
$$;
