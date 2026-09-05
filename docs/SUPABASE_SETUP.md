# Supabase setup

1. Create a Supabase project and retain the project URL and anon key.
2. In Authentication, enable email/password, require email confirmation, and optionally enable email OTP/magic links.
3. Add `http://localhost:3000/auth/callback` locally and the production `/auth/callback` URL to redirect URLs.
4. Install and authenticate the Supabase CLI, then run `supabase link --project-ref <project-ref>`.
5. Apply schema, RLS, functions, Storage policies, and Realtime configuration with `supabase db push`.
6. Put the URL and anon key in `.env.local`; do not use the service-role key in browser variables.
7. In Storage confirm the private `receipts` bucket exists. Object paths must begin with the signed-in user's UUID.
8. Run `npx supabase test db` before deployment.

The `handle_new_user` trigger creates a profile, preference rows, and a starter category set for each verified auth identity. SMTP should be configured for reliable production verification and password recovery.

Realtime subscriptions include a `user_id=eq.<current-user>` filter. RLS also applies when Supabase authorizes Realtime access.
