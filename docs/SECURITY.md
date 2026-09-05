# Security

## Primary boundary

Supabase Row Level Security is enabled and forced on every user-owned table. Authenticated CRUD policies require the row owner to equal `auth.uid()`. Frontend route guards and filters are UX only and are not treated as authorization.

The insert trigger derives ownership from the verified database auth context. A second trigger rejects cross-owner foreign-key relationships. Private Storage objects must use `<auth.uid()>/...` paths in the `receipts` bucket.

## Application controls

- Middleware refreshes verified sessions and protects product routes.
- AI and AI-assisted OCR provider code is absent. Reserved endpoints fail closed with `503` and do not read user data.
- Upload MIME type and 10 MB size are validated both in API code and Storage configuration.
- Security headers disable framing and MIME sniffing and limit browser permissions.
- Secrets remain server-only. Client code uses only the public anon key, with RLS as the boundary.

## Financial safety

Expenso never asks for or stores a UPI PIN, OTP, CVV, ATM PIN, bank password, or net-banking password. Statement imports, screenshots, manual entry, and voice are confirmation-first. No direct bank or UPI connection is implied.

## Verification

`supabase/tests/rls.sql` creates two identities and verifies cross-user profiles, categories, account balances, transactions, updates, deletes, attachments, budgets, goals, imports, recurring records, subscriptions, saved filters, merchant rules, spoofed ownership, and cross-owner foreign keys. It also asserts that RLS is enabled and forced on all 23 user-owned tables and that all four receipt-object policies exist. Run it for every migration change.

Production should additionally enable Supabase leaked-password protection, MFA if appropriate, short OTP expiry, email rate limits, database backups, and log retention.
