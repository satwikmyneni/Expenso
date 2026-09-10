# Local dashboard routing investigation - 2026-09-10

## Findings

The reported authenticated `GET /dashboard 404` could not be reproduced in the available session. Its exact historical cause remains unconfirmed. No route restoration or auth change was justified by the evidence.

- `src/app/(app)/dashboard/page.tsx` exists and contains the existing financial dashboard. It was not missing, moved, or renamed in the inspected working tree.
- There is no competing dashboard page. The `(app)` group is excluded from the URL, making `/dashboard` canonical.
- `src/app/(app)/layout.tsx` wraps it with `FinanceProvider` and `AppShell`.
- Proxy protection, login destination, and dashboard links use the correct canonical paths. No relevant rewrite or explicit `notFound()` was found.
- Both the current development app-paths manifest and production build register `/(app)/dashboard/page` as `/dashboard`.
- Only `next.config.ts` exists. Its existing allowlist had `127.0.0.1`, while the development log explicitly reported blocking `172.20.10.4` for `/_next/hmr`.

The confirmed LAN-origin mismatch affects development assets/endpoints. It is not evidence that the dashboard page route was absent, and is not claimed as the cause of the reported page 404. Stale development output is only a possibility, not a proven diagnosis; no cache was deleted on that assumption.

## Changes for this request

- `next.config.ts`: preserve `127.0.0.1` and add the observed development host `172.20.10.4`.
- `tests/e2e/dashboard-routing.spec.ts`: direct dashboard access, unauthenticated redirect, refresh, all eight requested routes, and navigation checks using the existing explicit sample workspace.
- This report.

No application route, authentication, Supabase, RLS, migration, financial logic, or UI was changed for this request. Pre-existing working-tree changes were preserved. The generated `next-env.d.ts` was restored to its starting development type paths after build verification.

## Verification

- Typecheck: passed.
- Lint: passed.
- Full unit suite: 33 files, 188 tests passed.
- Production build: passed; route output includes `/dashboard` and all seven other requested routes.
- Desktop Chromium and mobile WebKit route suite: 20 checks passed, including direct sample dashboard HTTP 200 and refresh HTTP 200.
- Additional managed navigation suite: 2 checks passed (desktop and mobile), verifying dashboard link target HTTP responses and clicking Transactions, Accounts, Categories, Goals, Insights, and Imports through the available navigation. Total final E2E coverage: 22 passed across the route and navigation runs.
- Actual running `http://localhost:3000`: desktop and mobile-sized Chromium rendered `/login` HTTP 200. An unauthenticated `/dashboard` returned HTTP 307 to `/login?next=%2Fdashboard`, whose final response was HTTP 200. The dashboard itself was not served to that unauthenticated browser.
- Actual development asset requests: origins `http://172.20.10.4:3000` and `http://127.0.0.1:3000` returned 200; `http://untrusted.example:3000` returned 403.
- An additional ad hoc link probe was interrupted when the completed E2E runner shut down its own server. Link verification was moved into the managed test suite. Its first desktop run inspected links before loading completed; the test now waits for the visible dashboard before selecting navigation.
- An initial live browser check waiting for the full load event timed out under concurrent checks. Repeating with DOM-content-loaded and an explicit visible login heading passed on desktop and mobile.

## Remaining verification

The E2E harness deliberately has no Supabase configuration and uses explicit sample mode. Those HTTP 200 checks do not prove authenticated Supabase behavior. No live test-user session was available, so actual sign-in -> dashboard, authenticated direct access/refresh, and authenticated mobile rendering on localhost:3000 remain unverified. The reported 404 should be reproduced in the user's signed-in browser before declaring it resolved. Capture the failing document response and corresponding server error if it persists; do not share passwords or session tokens.
