# Finance management follow-up - 2026-09-09

This extends the existing implementation. No production deployment or hosted Supabase mutation was performed.

## Findings and implementation

1. **Goals:** The existing management page supported editing and contribution history but offered only Archive. Delete now confirms and calls `delete_goal_safely`, which locks the owner-scoped goal, removes its allocations, then deletes it. Linked and unrelated financial transactions survive. Shared state drops both the goal and its contributions. Existing name, target, date, description, icon, linked-account and contribution editing remain. PostgreSQL now maintains completed/active status from saved and target amounts; the UI continues to display reached and overfunded amounts.
2. **Categories:** Normal deletion no longer archives. `delete_category_safely` recursively gathers the subtree, protects Uncategorized, moves transaction/bill/subscription/recurring references to the fallback, removes affected merchant rules, consolidates budget category links, and deletes descendants before parents atomically. Leaf-first deletion avoids unique-name collisions caused by promoting children to the root. Transaction IDs, amounts, dates, accounts, merchants and types remain unchanged. The migration normalizes legacy Uncategorized entries and enforces one per owner; its protection includes name, kind, parent and archive status.
3. **Accounts:** Independent `accounts.is_active` persists Active/Inactive without changing archive or liability status. Both desktop menus and mobile sheets offer reactivation/deactivation. History remains queryable and balances remain included. Manual/import/OCR selectors exclude inactive accounts for new activity, and provider/database validation prevents stale selectors from adding transactions. Existing historical account references remain editable. Existing dependency-safe account deletion/archive remains.
4. **Accounting:** Dashboard Total balance previously called `netWorth`. It now calls `totalBalance`, including bank/savings/current/checking/cash/wallet/prepaid/debit and explicit asset accounts, excluding investments and liabilities. Inactive accounts retain their money. Net worth keeps its existing inclusion settings and subtracts liabilities. Loans and credit cards have separate totals and account sections; generic liabilities have their own section. Existing expense/income/refund/transfer/loan principal-interest rules are unchanged.
5. **Charts:** The Dashboard previously inferred an actual historical balance from income minus spending, which cannot account for asset transfers and principal repayments. The existing income/spending chart now shows the period aggregates with an accurate label. It does not fabricate balance history. Transactions adds a selected-period income/spending summary and daily series; its caption states the summary period. Search/category/type filters scope the list and daily headings; the summary is explicitly the period/account overview.
6. **Transactions:** The existing database account/category/type/source/search/amount/date filters, URL state, pagination and deterministic date/upload/row/ID sorting are retained. Quick filters scroll internally. Date headings now appear on desktop and mobile, with exact net income/spending totals computed in PostgreSQL before pagination. A day spanning multiple pages retains its full matching total. Transfer principal is excluded and loan interest is spending. Mobile rows open the editor on tap; Delete is available inside the editor, while desktop row actions remain. Existing transaction dates, import timestamps, metadata and refund relationships are preserved.
7. **Dashboard navigation:** Existing Next.js links to transaction editors, account histories, categories, goals, budgets, recurring management, View All and Insights were retained and browser-tested. Added overview links target Loans, Credit cards and Accounts. Goal progress widths are capped at 100% while overfunded money remains visible in goal details.
8. **Insights/reports:** The mobile month picker now uses a full row to avoid clipping its label. Existing historical month/year selection, exclusive period ends, database aggregates and empty-period behavior remain intact. Category reassignment refreshes shared transactions/budgets and reloads live data, invalidating the existing query callbacks. No competing state system or AI calculation was introduced.
9. **Mobile/PWA:** Explicit device-width, initial scale and viewport-fit cover; document overflow constraints; dynamic viewport height; 16px form controls to prevent iPhone focus zoom; safe-area-aware navigation, page padding and dialogs. Standalone mode allows pan gestures without requesting pinch zoom; normal browser tabs retain accessibility zoom. Filter rows retain their own horizontal scroll. No maximum-scale/user-scalable prohibition is imposed globally. Physical installed-iPhone gesture behavior still requires device verification.
10. **Preserved architecture:** Authentication, RLS, imports, OCR recognition, private attachments, offline queue and the existing state/repository boundaries remain. The prior mobile reference screenshots were not attached to this turn; presentation follows the textual date-grouped reference and existing visual language.

## Database migration

`supabase/migrations/202609090001_safe_deletion_and_account_status.sql`

Apply before the updated frontend using the existing deployment procedure. It adds account status; normalizes/protects Uncategorized; adds ownership-scoped category/goal deletion RPCs; extends transaction queries with daily aggregates; guards new inactive-account references; and synchronizes goal completion. It preserves forced RLS and auth bootstrap triggers, revokes anonymous/public execution of the new deletion RPCs, and grants authenticated users the required table/RPC privileges. It does not reset the database or delete financial transactions.

## Verification

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed, no warnings/errors.
- `npm.cmd run test`: 188 passed in 33 files.
- `npm.cmd run test:db`: 8 migrations applied; 69 checks passed.
- `npm.cmd run test:e2e -- --workers=2`: 56 passed, 2 existing platform-specific skips (4.5 minutes), Chromium and iPhone/WebKit. All 320/375/390/393/414px responsive checks passed, plus imports, actual OCR, historical Insights/filter combinations, editor navigation and management regressions.
- Initial browser run exposed outdated Edit/Date selectors after the mobile row change, a localhost/127.0.0.1 test-origin mismatch, and blocked OCR downloads in the offline sandbox. Selectors and origin were corrected; the network-enabled final suite passed actual OCR in both browsers.
- `npm.cmd run build`: passed; 25 generated routes/pages, with TypeScript validation.
- Browser visual inspection: 14 desktop/mobile route captures; zero runtime errors in the separate capture run. Further visual review compacted mobile transaction rows, exposed deletion inside the editor, shortened the mobile chart and expanded the historical month control.
- Final targeted responsive/historical rerun after visual adjustments: 4 passed (1.5 minutes), including 390px layouts and historical filters in both engines. Final production build and ESLint passed again.
- `git diff --check`: passed. Browser fixtures use the isolated sample workspace; PostgreSQL tests exercise real SQL and RLS in PGlite with minimal Auth/Storage SQL contracts. They do not constitute a hosted Supabase API or physical-device smoke test.

The full `npm.cmd run test:security` command was attempted and could not connect to local Supabase at 127.0.0.1:54322. No credentials were requested or exposed.

## Remaining release checks

- Apply the new migration before releasing the frontend; this was deliberately not applied to hosted Supabase.
- Hosted Supabase API persistence/authentication, real two-user RLS/Storage and multi-device Realtime need the usual post-migration smoke test. Local SQL ownership/persistence and sample-browser reload tests passed; no hosted-persistence claim is made.
- The full local Supabase security suite requires the local stack on port 54322.
- Installed physical-iPhone safe areas, accessibility settings and pinch/scroll gestures require device verification; WebKit viewport/layout tests passed.

## Browser captures

Generated local artifacts, ignored by Git (test output may be replaced by a future E2E run):

- [Mobile transactions](../test-results/manual-audit/transactions-390.png)
- [Mobile historical Insights](../test-results/manual-audit/insights-390.png)
- [Desktop accounts](../test-results/manual-audit/accounts-1440.png)
- [Mobile goals](../test-results/manual-audit/goals-390.png)

## Exact changed files

- `docs/FINANCE_MANAGEMENT_20260909.md`
- `playwright.config.ts`
- `src/app/(app)/accounts/page.tsx`
- `src/app/(app)/categories/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/goals/page.tsx`
- `src/app/(app)/insights/page.tsx`
- `src/app/(app)/transactions/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/app-shell.tsx`
- `src/components/ui/modal.tsx`
- `src/features/accounts/managed-account-card.tsx`
- `src/features/accounts/premium-account-card.tsx`
- `src/features/dashboard/cashflow-chart.tsx`
- `src/features/finance/calculations.ts`
- `src/features/finance/finance-provider.tsx`
- `src/features/finance/repository.ts`
- `src/features/finance/types.ts`
- `src/features/imports/receipt-scanner.tsx`
- `src/features/imports/statement-importer.tsx`
- `src/features/transactions/query.ts`
- `src/features/transactions/transaction-modal.tsx`
- `src/features/transactions/transaction-row.tsx`
- `src/lib/supabase/database.types.ts`
- `supabase/migrations/202609090001_safe_deletion_and_account_status.sql`
- `tests/e2e/completeness.spec.ts`
- `tests/e2e/core-flows.spec.ts`
- `tests/e2e/management-regressions.spec.ts`
- `tests/integration/finance-database.mjs`
- `tests/unit/account-repository.test.ts`
- `tests/unit/calculations.test.ts`
- `tests/unit/dashboard-greeting-render.test.tsx`
- `tests/unit/goal-repository.test.ts`
- `tests/unit/transaction-query.test.ts`
