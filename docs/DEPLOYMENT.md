# Deployment

## Supabase

1. Create the production project.
2. Enable email/password, verification, recovery, and magic links. These remain available alongside social providers.
3. Link the CLI: `npx supabase link --project-ref <project-ref>`.
4. Apply migrations: `npx supabase db push`.
5. Run RLS tests against a local reset before pushing; inspect policies in the production dashboard afterward.
6. Confirm the private `receipts` bucket, policies, allowed MIME types, and 10 MB limit.
7. Configure production SMTP. In **Authentication → URL Configuration**, set the production Site URL and add the exact production `/auth/callback` URL to the redirect allow list. Add `http://localhost:3000/auth/callback` for local development. Prefer exact production URLs over broad wildcards.

### Account management and finance-model verification

Deploy every pending migration in order. In particular, `202609050002_grant_authenticated_account_management.sql` lets PostgREST reach the existing owner-only account UPDATE/DELETE policies, and `202609050003_add_goal_contributions_and_liability_tracking.sql` adds contribution provenance plus card, loan, and reminder metadata. Neither migration grants access to `anon` or disables RLS.

After deployment, run these read-only checks in the Supabase SQL Editor:

```sql
select
  has_table_privilege('authenticated', 'public.accounts', 'delete') as authenticated_can_reach_delete_policy,
  has_table_privilege('anon', 'public.accounts', 'delete') as anon_can_delete;

select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('accounts', 'goal_contributions', 'notifications')
order by tablename, cmd;

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in ('public.accounts'::regclass, 'public.goal_contributions'::regclass, 'public.notifications'::regclass);
```

Expected: authenticated account DELETE is `true`, anon DELETE is `false`, every policy is owner-scoped, and RLS plus forced RLS are both enabled. Then create an empty test account through Expenso and delete it; create a second account with one transaction and confirm Delete offers archive instead of destroying history.

### Statement import and receipt OCR

Apply `202609060001_add_deterministic_import_workflow.sql` after the existing 2026-09-05 migrations. It extends the existing owner-scoped import and merchant-rule tables, creates each profile's protected Uncategorized category, and adds a safe category-archive function. It does not alter auth triggers, relax RLS, or make the receipt bucket public.

No OCR API key or additional environment variable is required. Tesseract.js runs recognition in the browser, PDF.js handles text-first PDF extraction/rendering, and SheetJS reads XLS/XLSX locally. The Content Security Policy permits jsDelivr so Tesseract can download its versioned worker/core/language packages; receipt bytes are not posted there. A Netlify Next.js deployment can use the same browser workflow because OCR does not run in a Netlify Function. Users need network access the first time the browser downloads OCR runtime/language assets; the browser can cache them afterward.

After deployment, verify the migration and private storage boundary:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('imports', 'merchant_rules')
  and column_name in ('source_kind', 'duplicate_rows', 'failed_rows', 'merchant_normalized')
order by column_name;

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in (
  'public.imports'::regclass,
  'public.import_rows'::regclass,
  'public.merchant_rules'::regclass,
  'public.attachments'::regclass
);

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'receipts';
```

Expected: all four migration columns exist; every listed table has RLS and forced RLS enabled; and `receipts` is private with the existing 10 MB image/PDF restrictions.

### Production completeness: database queries and management

Deploy `supabase/migrations/202609070001_complete_finance_management.sql` **before**
deploying this frontend. It follows the six existing migrations and is forward-only.
Do not edit or reapply old migrations, reset the database, or disable RLS.

The migration adds goal description/account linkage, recurring archive/notes fields,
owner-checked goal linkage, transaction indexes, and these caller-privilege RPCs:

- `search_finance_transactions(jsonb)` — owner/date/account/category/type/source/
  search/amount filters, stable ordering, then pagination (maximum 100 rows).
- `finance_period_report(date,date,uuid)` — historical aggregates using the
  profile timezone and an exclusive end date.
- `save_budget_details(uuid,jsonb,uuid[])` — atomic budget and category-link editing.

It grants only the authenticated operations needed by existing owner-only policies
and adds managed entities to the Realtime publication if not already included.
No auth trigger, existing RLS policy, financial history, or receipt policy is removed.
An old database without this migration will display the actual query/schema error;
the application must not substitute sample data.

Release sequence from the already-linked repository:

1. Take/confirm the usual database backup and review pending migration history:
   `supabase migration list` and `supabase db push --dry-run`.
2. Confirm the six earlier migrations are recorded and the new completeness
   migration is the intended pending change. Resolve any unexpected drift first.
3. Apply through your normal migration pipeline, or run `supabase db push` after
   reviewing that dry-run. No migration was applied to your hosted project by this
   implementation task.
4. Install dependencies with `npm ci`, run `npm run check`, `npm run test:db`, and
   `npm run test:e2e`, then deploy the frontend. OCR browser tests need access to
   Tesseract's public worker/core/language downloads; receipt recognition is local.
5. Sign in normally. Check historical transaction filtering/pagination, July/August/
   September reports, editing a transaction's date, goal/contribution edits, budget
   edits, recurring pause/resume/archive, and refresh persistence. Confirm a second
   user cannot see any of the first user's rows or private receipt attachments.
6. Verify cross-device Realtime, real iPhone PWA offline/reconnect, and the deployed
   receipt/PDF OCR workflow. Embedded SQL tests do not replace this hosted smoke test.

Read-only catalog verification:

```sql
select table_name, column_name
from information_schema.columns
where table_schema='public'
  and ((table_name='goals' and column_name in ('description','linked_account_id'))
    or (table_name='recurring_transactions' and column_name in ('notes','archived_at')));

select p.proname, p.prosecdef as security_definer,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
  has_function_privilege('anon',p.oid,'execute') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
  ('search_finance_transactions','finance_period_report','save_budget_details');

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('accounts','transactions','categories','budgets','goals','goal_contributions',
   'bills','subscriptions','recurring_transactions','merchant_rules','attachments');
```

Expected: four added columns; all three RPCs are security invoker with authenticated
execute and no anonymous execute; every listed table retains enabled, forced RLS.
Do not run owner RPCs as anonymous SQL Editor calls to simulate authentication.

The production CSP includes `wasm-unsafe-eval` for local OCR's WebAssembly, not
general JavaScript eval. No new production environment variables or secrets are needed.

See [Production completeness report](PRODUCTION_COMPLETENESS.md) for exact coverage
and verification limitations.

## Google, Apple, and Microsoft sign-in

Provider credentials belong in the provider console and **Supabase Dashboard → Authentication → Providers**. They are not application environment variables and must never be placed in frontend code or committed files.

For every provider, the provider-side OAuth callback/redirect URI is the Supabase Auth endpoint:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Expenso then returns through its PKCE exchange route:

```text
https://<your-app-origin>/auth/callback
```

Configure each provider as follows:

1. **Google:** create a Web OAuth client in Google Auth Platform, add the application origins, add the Supabase Auth callback URI, then enter the Google client ID and secret in the Supabase Google provider.
2. **Apple:** create an App ID and web Services ID, enable Sign in with Apple, configure the Supabase project domain and Supabase Auth callback URI, create the Apple signing key/client secret, and enter the values in the Supabase Apple provider. Apple web OAuth client secrets expire every six months; schedule rotation before expiry. If Apple returns a private relay email, do not assume it is the same account as a differently addressed email/password user.
3. **Microsoft:** register a Web application in Microsoft Entra ID, choose the intended tenant/account audience, add the Supabase Auth callback URI, then enter the Application (client) ID and secret in the Supabase Azure provider. Supabase's JavaScript provider identifier is `azure`; Expenso presents it to users as Microsoft. Use `localhost`, not `127.0.0.1`, in Microsoft local-development URLs where the provider requires it.

After a provider is enabled and tested in Supabase, set only its non-secret UI availability switch to `true` in each deployment environment:

```text
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_AUTH_APPLE_ENABLED=true
NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true
```

Leave a switch `false` when its provider is not configured. Expenso keeps the button visible as unavailable and directs the user to email sign-in instead of crashing. Provider client secrets stay in Supabase Auth configuration; none of these switches contains credentials.

Supabase Auth automatically links a new OAuth identity to an existing user when it can safely match the same verified email. Expenso does not perform name-based matching or custom client-side merging. Finance rows and profiles remain keyed by the authenticated `auth.users.id`, so adding an identity never changes the ownership boundary. Treat genuinely different emails—including Apple relay addresses—as different users unless the authenticated user deliberately uses Supabase's identity-linking workflow in a future account-management feature.

## Vercel

1. Import the repository as a Next.js project.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and the three provider availability switches for Preview and Production. Public Supabase values are injected at build time, so rebuild after changing them.
3. Keep `AI_PROVIDER=disabled` and leave the other reserved `AI_*` values blank.
4. Keep the build command `npm run build` and output preset Next.js.
5. Deploy, then set the exact production URL in Supabase Site URL and redirect allowlist.

## Release verification

1. Sign up and verify a new email.
2. Sign in with email/password and a magic link, refresh, sign out, recover a password, and test expired-session behavior.
3. For each configured social provider, verify success, user cancellation, provider denial/error, an invalid or expired callback, refresh persistence, logout, login again, and a protected-route redirect.
4. Sign up with email/password, verify the email, then sign in with a configured OAuth provider returning the same verified email. Confirm Supabase lists both identities on one user and that the same finance profile remains. Never validate linking by display name.
5. Create two genuinely different users and repeat the RLS isolation scenario.
6. Add and edit a historical expense; confirm account, budget, dashboard, and insights change.
7. Test transfers and refunds without spending double-counting.
8. Import sanitized PDF/CSV/TXT/XLS/XLSX statements, edit and confirm selected rows, then repeat the same file and verify duplicate choices appear.
9. Scan a sanitized image and PDF receipt on iPhone and Windows, edit the preview, confirm it, and verify the optional attachment is private. Verify the receipt bucket policies with two authenticated test users.
10. Install the PWA; test offline launch, queued entry, and reconnect sync.
11. Open the same user on two devices and confirm Realtime refresh.
12. Check iPhone-sized and Windows desktop layouts, keyboard focus, dark theme, and reduced motion.

An equivalent Next.js host can replace Vercel. Self-hosted deployments should serve HTTPS and preserve secure auth cookies.
