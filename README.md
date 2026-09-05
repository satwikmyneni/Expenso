# Expenso

Expenso is a private, multi-user personal finance PWA for expenses, accounts, budgets, goals, recurring costs, imports, analytics, and net worth. Every user has an independent workspace. It is not a shared or family-finance product.

## What is included

- Supabase email/password, email verification, password recovery, magic links, Google/Apple/Microsoft OAuth, SSR/PKCE sessions, protected routes, and logout.
- PostgreSQL `NUMERIC(20,2)` money fields, normalized relationships, scoped views/functions, indexes, ownership triggers, RLS, and private Storage policies.
- Responsive mobile bottom navigation and dedicated desktop sidebar/table layouts.
- Transaction create, edit (including historical dates), delete, search, combined filters, exact balance/report recalculation, duplicate warnings, transfers, and refunds.
- Accounts, budgets, goals, recurring payments, bills, subscriptions, calendar, deterministic insights, exports, and structured backups.
- Review-first CSV/TXT/XLSX imports with common Indian bank headings and Indian number formats.
- Voice entry with confirmation and deterministic, user-scoped financial insights. AI and image OCR are intentionally disabled.
- PWA manifest, service-worker shell cache, IndexedDB offline mutation queue, retry state, and user-scoped Realtime refresh.
- Realistic, explicitly entered and clearly labeled sample workspace that never impersonates live data.

## Local development

Requirements: Node.js 20+ and npm. For the real backend, also install Docker and the Supabase CLI.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Real Supabase data is the default whenever valid public project values are present. The explicit **Explore sample workspace** entry is available only when both public Supabase values are absent; sample changes persist only in that browser. Present-but-invalid configuration and live connection/authentication failures are surfaced instead of falling back to sample data.

For a local Supabase stack:

```bash
npx supabase start
npx supabase db reset
```

Copy the local API URL and anon key printed by `supabase status` into `.env.local`, then restart Next.js. See [Supabase setup](docs/SUPABASE_SETUP.md).

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npx supabase test db
```

The RLS suite needs the local Supabase stack. E2E tests start the Next.js dev server automatically.

## Environment variables

| Variable | Scope | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Production backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Production backend |
| `NEXT_PUBLIC_APP_URL` | Browser/server | Recommended |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` | Browser | `true` only after Google is configured in Supabase Auth |
| `NEXT_PUBLIC_AUTH_APPLE_ENABLED` | Browser | `true` only after Apple is configured in Supabase Auth |
| `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED` | Browser | `true` only after Azure (Microsoft) is configured in Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Only privileged admin jobs; unused by client paths |
| `AI_PROVIDER` | Server only | Reserved for a future release; keep `disabled` |
| `AI_BASE_URL` | Server only | Reserved; leave blank |
| `AI_MODEL` | Server only | Reserved; leave blank |
| `AI_API_KEY` | Server only | Reserved; leave blank |

Never expose a service-role or any future provider key through a `NEXT_PUBLIC_` variable.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Imports](docs/IMPORTS.md)
- [AI status](docs/AI.md)
- [PWA and offline sync](docs/PWA.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
