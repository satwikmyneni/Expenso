-- Account editing and deletion use the existing owner-only forced RLS policies.
-- These table privileges only allow PostgREST to reach those policies; they do
-- not broaden which rows an authenticated user can update or delete.
grant update, delete on table public.accounts to authenticated;
