# Production completeness pass

## Inspection

The existing routes, shared transaction editor, account manager, goal contribution
manager, import/OCR review flows, provider, repository, schema, grants, and forced
RLS policies were inspected before editing.

- Transactions currently download/filter an unbounded snapshot, lack date and sort
  controls, and use an incomplete timestamp-only ordering.
- Insights and its chart always select the current month. Historical URL state and
  drill-downs are missing.
- Dashboard transaction/category/goal/budget/bill items are static containers.
- Account create/edit/archive and goal contribution create/edit/remove already
  exist and will be extended, not duplicated.
- Goals, budgets, bills, and recurring items lack update/archive actions and some
  necessary authenticated grants. Paused/cancelled records are excluded on load.
- Category editing/hierarchy and merchant rule creation/scope editing are missing.
- The transaction editor resets import metadata and source during ordinary edits.
- Mobile risks include intrinsic select widths, flex children without min-width:0,
  fixed transaction columns, and uncontained long headings and references.

## Approach

Reuse existing routes and dialogs. Use authenticated, security-invoker SQL functions
for transaction filtering/order/pagination and period aggregation. Keep RLS and
owner checks active. Reuse occurred_at, created_at, import_id and metadata.import_row
for ordering; no redundant sequence column. Financial reports query bounded periods
and return aggregates instead of downloading full history. Explicit backup/export
may page through all matching records at the user's request.

Forward migration: 202609070001_complete_finance_management.sql. Never reset the
database or change old migrations/auth triggers to deploy this work.

## Implementation report

1. **Root causes:** unbounded transaction snapshots, incomplete sort ties,
   current-month-only reports, static dashboard items, missing entity mutations,
   import metadata reset on edits, and intrinsic-width mobile review cards.
2. **Dashboard navigation:** transaction rows open the existing editor; account,
   category, budget, goal, bill, subscription, and Insights links reach their routes.
3. **Dead controls:** entity summaries use links, mutations use buttons, and
   chart/summary decoration remains non-interactive. View/See All routes work.
4. **Ordering:** transaction timestamp descending, persisted creation/import batch
   timestamp, original statement row, then ID. Explicit oldest/amount/upload sorts
   use stable ties too. Dashboard and account history share the same query.
5. **Date filter:** all dates, today/yesterday, current week/month/year, previous
   month/year, last 7/30 days, and validated inclusive custom dates converted to an
   exclusive end. Filters, sorting, and page are URL state.
6. **Database filtering:** `search_finance_transactions` combines owner, account
   (including incoming transfers), category, type, source, import batch, ID, search,
   date and amount filters before SQL sorting/pagination. UI pages contain 25 rows;
   the workspace caches only 100 recent rows. Explicit exports page through all
   requested matching records. Offline cached rows are clearly identified, not
   represented as complete history or demo data.
   Rapid filter changes now compose from the current browser URL through Next's
   native-history integration, preventing an Amount change from being lost when
   Sort is changed immediately afterward.
7. **Upload order:** existing `import_id`, batch `created_at`, and
   `metadata.import_row` are reused. No redundant sequence column was introduced.
8. **Goals:** create/edit name, description, target/date, linked account, icon and
   color; archive retains database history. Goal account links are owner-checked.
9. **Contributions:** existing add/edit/remove/history/recalculation is retained.
   Editing a goal never writes its saved/opening amount. Virtual allocations do
   not create spending or deduct accounts twice.
10. **Accounts:** existing validated create/edit/safe-delete/archive remains;
    account cards open database-filtered history and income/expense/transfer
    summaries. Reminder links open the existing account editor.
    Archived accounts retain their history; because the existing balance view
    excludes them, the history header labels their balance "Archived" rather than
    deriving an incorrect balance from the recent cache.
11. **Categories:** name, kind, parent, display order and color editing; protected
    Uncategorized remains protected. Existing safe archive reassignment is reused.
12. **Budgets:** edit amount, period and multiple categories atomically; archive
    leaves transactions and category history intact. Spending uses the budget's
    week/month/year rather than the recent workspace page.
13. **Bills/subscriptions:** edit details, billing frequency, dates, account and
    category; bills include reminders/notes/paid state; subscriptions can be
    cancelled/reactivated or archived. Marking a bill paid does not fabricate a
    transaction; the UI explains this.
14. **Recurring:** edit amount/direction/frequency/date/account/category/notes;
    pause/resume and a distinct persisted archive timestamp.
15. **Merchant rules:** create/edit/delete exact personal rules with optional
    account/type scope. No historical transactions are rewritten.
16. **Historical Insights:** one selected-period report supplies income, net
    expenses, cash flow, savings rate, category ranking, largest expense, count,
    recurring/subscription spending and budget spending. Empty periods show zeros
    and an unavailable savings rate, never current-month or fake data.
17. **Month navigation:** previous/next, direct native month picker, current period,
    bookmarkable URL, and future-period clamping.
18. **Year navigation:** direct year selection plus previous/next yearly reporting.
19. **Trends/comparisons:** selected-month 6/12-month series, yearly 12-month series,
    previous-period and same-month-last-year comparisons. Missing comparison data
    is explicit. Charts use database aggregates, not the recent transaction cache.
20. **Drilldowns:** period/category/income links retain date context; largest
    expense opens that exact historical transaction. Query results are owner-keyed
    and obsolete asynchronous responses are discarded. Mutations/Realtime reload
    invalidate queries so date changes move activity between reports.
21. **OCR:** existing local Tesseract/PDF.js workflow retained. Actual Chromium
    recognition of the synthetic PNG produced `156.44` and waited for review.
    The CSP permits WebAssembly compilation without enabling production JS eval.
    First use requires the public worker/core/language downloads; no receipt bytes
    are sent to those asset hosts.
22. **Imports:** existing PDF/CSV/TXT/XLS/XLSX parser, conservative categorization,
    duplicate/transfer detection, review and explicit confirmation are retained.
    Transaction edits preserve source/import metadata, description and reference.
    Historical purchase search for manual refunds uses the existing transaction
    query, not only the recent cache. Attachments use short-lived private URLs.
23. **Overflow root cause:** populated mobile statement review expanded the page
    to 511px due to implicit grid minimums plus unshrinkable merchant/reference text
    next to a non-wrapping status badge.
24. **Overflow fix:** explicit minmax-compatible single-column grids, min-width:0
    flex children, wrapping references, responsive controls, bounded modal/card
    widths, and contained desktop tables. No global overflow-x hiding was added.
25. **Widths:** browser assertions check document width at 320/375/390/393/414px
    across dashboard, transactions/filters/modal, accounts, categories, goals,
    budgets, recurring, Insights, calendar, imports/review, OCR entry and settings.
26. **Security:** forced RLS/policies and auth/session code were not changed.
    The isolated PostgreSQL test applies all seven migrations and exercises
    bootstrap, persistence, query isolation, owner linkage and denied cross-owner
    writes. The full Supabase security command was attempted but port 54322 has no
    running local Supabase database. Private Storage and hosted cross-user tests
    still require the deployment smoke test.
27. **Migration:** only the new
    `202609070001_complete_finance_management.sql` is required. No old migration
    was edited and no hosted schema change was applied automatically.

## Verification results

Verified locally on 2026-09-08:

28. **Typecheck:** passed (`npm.cmd run check`).
29. **ESLint:** passed, zero errors/warnings (`npm.cmd run check`).
30. **Unit tests:** 184 passed across 33 files (`npm.cmd run check`).
31. **E2E:** 44 passed, 2 intentional platform-specific skips, in Chromium and
    iPhone/WebKit (`npm.cmd run test:e2e -- --workers=2`). Both engines passed every
    requested width, historical/report/filter mutations, management, and actual
    local OCR recognition/review. Runtime-error assertions passed; a separate
    six-route Chromium console audit reported zero errors.
32. **Production build:** passed; all 25 generated pages and dynamic routes compiled
    (`npm.cmd run check`, including `npm.cmd run build`).
33. **Exact files:** listed in the following section. `git diff --check` passed.
34. **Deployment:** apply the new migration before the frontend, using the exact
    review/apply/catalog/smoke-test sequence in `docs/DEPLOYMENT.md`.

`npm.cmd run test:db`: all seven migrations applied to isolated PostgreSQL;
40 assertions passed, including real SQL mutations, historical totals, stable
pagination, original import row ordering, timezone boundaries, bootstrap,
cross-owner denial, private receipt paths, and anonymous RPC denial.

`npm.cmd run test:security` was attempted but the full local Supabase stack was
unavailable (connection refused on 127.0.0.1:54322). The embedded test supplies
minimal Auth/Storage SQL contracts, not those API services. Browser fixtures are
explicit isolated sample data. None of these results claims hosted deployment or
physical-device verification has already happened.

Actual browser captures (generated, ignored by Git; retained until another E2E run):

- [320px dashboard](../test-results/completeness-responsive-pages-filters-and-modals-fit-320px-desktop/dashboard-320.png)
- [390px iPhone Insights](../test-results/completeness-responsive-pages-filters-and-modals-fit-390px-mobile/insights-390.png)
- [320px iPhone statement review](../test-results/completeness-responsive-pages-filters-and-modals-fit-320px-mobile/import-review-320.png)
- [iPhone local OCR review](../test-results/completeness-local-OCR-rea-9fd9b-eceipt-and-waits-for-review-mobile/actual-local-ocr-review.png)

## Exact changed files

- `docs/DEPLOYMENT.md`
- `docs/PRODUCTION_COMPLETENESS.md`
- `next-env.d.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `src/app/(app)/accounts/page.tsx`
- `src/app/(app)/budgets/page.tsx`
- `src/app/(app)/calendar/page.tsx`
- `src/app/(app)/categories/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/goals/page.tsx`
- `src/app/(app)/insights/page.tsx`
- `src/app/(app)/recurring/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/transactions/page.tsx`
- `src/components/app-shell.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/modal.tsx`
- `src/features/accounts/managed-account-card.tsx`
- `src/features/accounts/premium-account-card.tsx`
- `src/features/dashboard/cashflow-chart.tsx`
- `src/features/dashboard/spending-ring.tsx`
- `src/features/finance/finance-provider.tsx`
- `src/features/finance/repository.ts`
- `src/features/finance/types.ts`
- `src/features/finance/use-finance-query.ts`
- `src/features/imports/merchant-rule-manager.tsx`
- `src/features/imports/statement-importer.tsx`
- `src/features/insights/category-bars.tsx`
- `src/features/insights/reports.ts`
- `src/features/transactions/purchase-selector.tsx`
- `src/features/transactions/query.ts`
- `src/features/transactions/transaction-modal.tsx`
- `src/features/transactions/transaction-row.tsx`
- `src/lib/supabase/database.types.ts`
- `supabase/migrations/202609070001_complete_finance_management.sql`
- `tests/e2e-server.mjs`
- `tests/e2e/completeness.spec.ts`
- `tests/e2e/core-flows.spec.ts`
- `tests/integration/finance-database.mjs`
- `tests/run-e2e.mjs`
- `tests/unit/dashboard-greeting-render.test.tsx`
- `tests/unit/finance-query-lifecycle.test.tsx`
- `tests/unit/transaction-query.test.ts`

`next-env.d.ts` is generated by Next.js; its references follow the current
development/build type-output location. No environment file, auth callback/proxy,
Supabase configuration validator, or existing migration was changed.

## Deployment / remaining release checks

Follow the exact migration-before-frontend sequence and read-only catalog queries
in [DEPLOYMENT.md](DEPLOYMENT.md#production-completeness-database-queries-and-management).
After deployment, verify normal authentication, cross-user isolation/private
attachments, real two-device Realtime, historical mutation persistence, and installed
iPhone PWA offline/reconnect. No real credentials or financial records were used by
the automated suite. No AI, banking API, or new authentication mechanism was added.
