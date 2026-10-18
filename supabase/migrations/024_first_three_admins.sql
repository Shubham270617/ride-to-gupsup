-- ============================================================================
-- Migration 024 — Admins are the first 3 people to sign in on the admin page
-- ============================================================================
-- Run AFTER 022, in the Supabase SQL Editor. Safe to re-run.
--
-- Replaces the email allowlist from migrations 020/023. The rule is now:
--   * the first 3 people to sign in at /admin/login become the admins
--     (api/auth/claim-bootstrap-admin.js gives them a row in admin_profiles);
--   * the admin_seat_cap trigger refuses a 4th, so nobody else gets in
--     until an existing admin is revoked in Admin -> Members;
--   * is_admin() — which every admin-only RLS policy uses — is simply
--     "this account holds one of those seats".
--
-- Existing admins keep their seats: admin_profiles is not touched.
-- Deletes: the admin_allowed_emails table and its helper functions.
-- ============================================================================

-- 1. is_admin() no longer looks at an email list. Redefined first, while
--    the old table still exists, so no policy is ever left pointing at a
--    function that reads a missing table.
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.admin_profiles ap where ap.id = auth.uid());
$$;

-- 2. Stop checking new admin seats against the email list.
drop trigger if exists admin_allowlist_guard on admin_profiles;
drop function if exists enforce_admin_allowlist();

-- 3. Remove the list itself (and the clean-up trigger from migration 023).
drop table if exists admin_allowed_emails cascade;
drop function if exists normalize_admin_allowed_email();

-- 4. Keep the 3-seat limit (unchanged from migration 020; re-stated so this
--    file works on its own). The lock stops two simultaneous sign-ins from
--    both becoming the 3rd admin.
create or replace function enforce_admin_seat_cap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('admin_seat_cap'));

  if (select count(*) from public.admin_profiles) >= 3 then
    raise exception 'Admin seat cap of 3 reached — remove an existing admin first.';
  end if;
  return new;
end;
$$;

drop trigger if exists admin_seat_cap on admin_profiles;
create trigger admin_seat_cap
  before insert on admin_profiles
  for each row execute function enforce_admin_seat_cap();

-- Check who holds the seats (read-only):
--
--   select ap.full_name, u.email, ap.created_at
--   from admin_profiles ap join auth.users u on u.id = ap.id
--   order by ap.created_at;
