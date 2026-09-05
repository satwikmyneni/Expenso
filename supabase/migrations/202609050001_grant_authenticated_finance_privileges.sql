-- PostgREST requires table privileges before it evaluates row-level policies.
-- Grant only the operations used by the Expenso browser repository. Existing
-- forced RLS policies remain the ownership boundary for every affected table.
grant usage on schema public to authenticated;

grant select on table
  public.profiles,
  public.accounts,
  public.categories,
  public.transactions,
  public.budgets,
  public.budget_categories,
  public.goals,
  public.recurring_transactions,
  public.subscriptions,
  public.bills,
  public.account_balances
to authenticated;

grant insert on table
  public.accounts,
  public.categories,
  public.transactions,
  public.budgets,
  public.budget_categories,
  public.goals,
  public.recurring_transactions,
  public.subscriptions,
  public.bills
to authenticated;

grant update on table
  public.profiles,
  public.categories,
  public.transactions
to authenticated;

grant delete on table public.transactions to authenticated;
