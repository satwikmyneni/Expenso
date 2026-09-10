# Migration execution fix - 2026-09-10

## Local code fixed; remote migration not applied

Corrected the existing pending migration:
`supabase/migrations/202609090001_safe_deletion_and_account_status.sql`.
No new migration was created. No application functionality was changed in this follow-up. Earlier uncommitted application changes were left intact.

## Root cause

The original file placed `LOCK TABLE public.categories IN ACCESS EXCLUSIVE MODE` at top level with no explicit transaction block. The reported runner executed it through a path that does not establish a PostgreSQL transaction block for that statement, producing SQLSTATE 25P01. There was no COMMIT, ROLLBACK, concurrent index, or other transaction-ending statement in the original file.

Supabase documents this same failure in its CLI issue tracker: the newer runner pipelines individual Parse/Bind/Execute statements rather than sending a whole file as one simple SQL query. A pipeline is not a transaction block for LOCK TABLE. The exact npx CLI version used by the user was not established here; the reported error matches that execution behavior. The locally installed CLI is 2.75.0. `npx supabase --version` could not fetch the package because the npm registry request failed with EACCES.

The old integration harness used `db.exec(sql)` for the whole migration. PostgreSQL supplied an implicit transaction for that multi-statement simple-query message, masking the runner incompatibility.

Sources:
- [Supabase CLI pipeline/LOCK TABLE issue #6347](https://github.com/supabase/cli/issues/6347)
- [PostgreSQL DO documentation](https://www.postgresql.org/docs/current/sql-do.html)

## Exact correction and safety

The entire migration is now one `DO $migration$ ... $migration$` statement. Its PL/pgSQL `BEGIN`/`END` delimit a procedural block; they are not transaction-control commands. It contains no COMMIT or ROLLBACK and also works when the caller already supplies a transaction.

The original exclusive lock is retained and held through normalization, restoration of the protection trigger, unique-index creation, RPC definitions/grants and status triggers. All changes either finish together or roll back. Trigger suspension cannot be committed independently. RLS policies, ownership checks, financial accounting, category/goal deletion semantics and auth bootstrap remain unchanged.

Retry tolerance uses `ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`, and `CREATE OR REPLACE` for functions/triggers. Existing inactive account values are not overwritten. This tolerates a previous attempt that committed the initial account column, without claiming to reconcile arbitrary schema drift.

## Regression coverage

The target migration now executes via `db.query(sql)`, which uses the extended protocol and accepts a single SQL statement, without a caller-supplied transaction. The test first reproduces 25P01 with the old standalone lock. Additional tests cover:

- Early failure after disabling protection: earlier DDL and trigger state roll back.
- Late failure after all migration work: normalization, schema changes and index roll back.
- Missing protected Uncategorized creation for existing users.
- Legacy duplicate fallback consolidation and transaction reassignment.
- Duplicate fallback prevention, including different parents.
- Retry after a pre-existing status column, complete replay and caller-managed transaction.
- Inactive account status and financial transaction fields surviving retries.
- Existing category subtree deletion, unchanged amounts/dates/accounts/merchants/types, no Archived category, contribution management, account status and cross-owner RLS checks.

## Verification

- TypeScript: passed.
- ESLint: passed; updated integration test also passed a final focused lint check.
- Relevant unit tests: 47 passed in 6 files (account repository/semantics, goals, transaction queries, calculations, security boundaries).
- PostgreSQL integration: all 8 migrations applied; 86 checks passed.
- Production build: passed; 25 pages generated with TypeScript validation.
- Relevant E2E initial run: 10 passed, 2 page-load timeouts (desktop category startup and mobile accounts navigation); serial rerun of both account/category cases in both browsers: 4 passed (37.6 seconds), without application changes.

- `git diff --check`: passed.

## Remote status and next action

`supabase migration list` and `supabase db push --dry-run` were attempted using the installed CLI. Both stopped at authentication: no Supabase CLI access token was available. No remote push was executed, no hosted schema/data was changed, and no frontend was deployed.

In your authenticated terminal, follow the existing release workflow:

```powershell
npx supabase migration list
npx supabase db push --dry-run
# After reviewing the pending migration and confirming the usual backup:
npx supabase db push
```

Do not reset the database, repair migration history to bypass this file, or manually replay fragments in production. If the migration is already recorded remotely, review that state before attempting any repair. Hosted success remains unverified until the normal push completes.

## Files changed in this follow-up

- `supabase/migrations/202609090001_safe_deletion_and_account_status.sql`
- `tests/integration/finance-database.mjs`
- `docs/MIGRATION_FIX_20260910.md`
