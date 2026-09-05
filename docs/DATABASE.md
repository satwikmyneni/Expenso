# Database

The migration is [the initial schema](../supabase/migrations/202609030001_initial_schema.sql).

## Ownership

Every user-owned table has either `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` or, for one-to-one records, a user ID primary key. `enforce_row_owner()` overwrites a client-provided owner with `auth.uid()` on insert. Cross-table ownership triggers reject links to another user's account, category, transaction, import, budget, tag, or goal.

## Exact money

All amounts are `NUMERIC(20,2)` with positive/appropriate constraints. Transaction semantics determine their sign. Transfers reference source and destination accounts but are excluded from spending. Refunds link to an original expense and reduce net spending.

## Core tables

`profiles`, `accounts`, `categories`, `transactions`, `tags`, `transaction_tags`, `attachments`, `budgets`, `budget_categories`, `goals`, `goal_contributions`, `recurring_transactions`, `subscriptions`, `bills`, `imports`, `import_rows`, `merchant_rules`, `saved_filters`, `notifications`, `notification_preferences`, `dashboard_preferences`, `ai_settings`, and `audit_logs`.

## Derived data

- `account_balances` is a `security_invoker` view, so caller RLS remains active.
- `monthly_financial_summary(date)` returns exact income, gross spending, refunds, net spending, savings, and savings rate.
- Common user/date, account, category, type, import, recurring, merchant, bill, and unread-notification paths are indexed.

Apply migrations through `supabase db reset` locally or `supabase db push` against a linked project. Do not edit production tables manually; add a new migration.
