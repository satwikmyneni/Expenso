# Testing

Run the local layers:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Unit tests cover decimal parsing, exact sums, refunds, transfer double-count prevention, liability balances, savings rate, merchant categories, duplicate detection, Indian statement normalization, review routing, and voice parsing.

Playwright runs its sample-workspace flows on an isolated port with both public Supabase values intentionally absent. It exercises the public-to-demo journey, adding/editing a historical transaction, and the mobile central add flow on desktop and iPhone-sized projects without overriding the developer's configured application server.

With local Supabase running:

```bash
npx supabase db reset
npx supabase test db
```

The pgTAP suite is the mandatory RLS/cross-user layer. Run it after every schema or policy change. Hosted-environment smoke tests should additionally cover verification email delivery, password reset redirect allowlists, receipt signed URLs, Realtime propagation on two devices, and offline replay.
