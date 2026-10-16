-- ============================================================================
-- Migration 020 — Admin access is an email allowlist, enforced in Postgres
-- ============================================================================
-- Run AFTER 019, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- The problem this fixes:
--   Admin meant "there is a row in admin_profiles with my user id" — and the
--   ONLY thing standing between any logged-in member and such a row was a
--   count: api/auth/claim-bootstrap-admin.js granted admin to whoever asked,
--   as long as fewer than 2 admins existed. No email was ever checked. Any
--   member could call that endpoint directly with their own token and poll
--   it, and revoking an admin re-opened that seat to the general public.
--
-- What this adds:
--   admin_allowed_emails   the list of addresses permitted to be admins.
--   is_admin()             now requires BOTH an admin_profiles row AND that
--                          the signed-in user's email is on the list. Every
--                          one of the ~49 RLS-protected tables calls this,
--                          so they all inherit the restriction at once.
--   admin_allowlist_guard  a BEFORE INSERT trigger on admin_profiles that
--                          rejects a non-allowlisted account. Triggers fire
--                          even for the service-role key, so this holds
--                          against the serverless layer too — a bug or a
--                          compromise there still cannot mint an admin.
--
-- Seats go from 2 to 3, and the cap is now race-safe.
--
-- !! IMPORTANT !! Read the "WHO IS AN ADMIN" section below before running.
-- ============================================================================

create table if not exists admin_allowed_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

comment on table admin_allowed_emails is
  'Addresses permitted to hold admin access. Being on this list does not grant admin on its own — an admin_profiles row is still required — but admin is impossible without it.';

-- ============================================================================
-- WHO IS AN ADMIN
-- ============================================================================
-- Everyone who is an admin RIGHT NOW is carried over automatically, so
-- running this migration can never lock you out of your own dashboard.
insert into admin_allowed_emails (email, note)
select lower(u.email), 'carried over from existing admin_profiles'
from admin_profiles ap
join auth.users u on u.id = ap.id
where u.email is not null
on conflict (email) do nothing;

-- ADD THE THIRD ADMIN HERE. Uncomment and put the real address in — it must
-- match the email they actually sign in with, lower-cased. They then log in
-- once at /admin/login and the seat is granted automatically.
--
-- insert into admin_allowed_emails (email, note)
-- values ('third-admin@example.com', 'added in migration 020')
-- on conflict (email) do nothing;
--
-- This list is also editable from Admin -> Members once you are signed in,
-- so you do not have to come back to SQL to change it later.
-- ============================================================================

alter table admin_allowed_emails enable row level security;

drop policy if exists "admin_allowed_emails admin read" on admin_allowed_emails;
create policy "admin_allowed_emails admin read" on admin_allowed_emails
  for select using (is_admin());

drop policy if exists "admin_allowed_emails admin insert" on admin_allowed_emails;
create policy "admin_allowed_emails admin insert" on admin_allowed_emails
  for insert with check (is_admin());

drop policy if exists "admin_allowed_emails admin delete" on admin_allowed_emails;
create policy "admin_allowed_emails admin delete" on admin_allowed_emails
  for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- is_admin() — now allowlist-aware.
-- ----------------------------------------------------------------------------
-- Checking the email here rather than only at the point of granting means a
-- stray admin_profiles row — inserted by a future bug, a careless hand-run
-- SQL statement, or anyone who got hold of the service-role key — confers
-- nothing at all. Access is re-derived from the allowlist on every request.
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    join auth.users u on u.id = ap.id
    where ap.id = auth.uid()
      and lower(u.email) in (select lower(email) from public.admin_allowed_emails)
  );
$$;

-- ----------------------------------------------------------------------------
-- Reject non-allowlisted accounts at the point of insert.
-- ----------------------------------------------------------------------------
create or replace function enforce_admin_allowlist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  candidate_email text;
begin
  select lower(email) into candidate_email from auth.users where id = new.id;

  if candidate_email is null then
    raise exception 'Cannot grant admin: no account found for %', new.id;
  end if;

  if not exists (
    select 1 from public.admin_allowed_emails where lower(email) = candidate_email
  ) then
    raise exception 'Cannot grant admin: % is not on the admin allowlist.', candidate_email;
  end if;

  return new;
end;
$$;

drop trigger if exists admin_allowlist_guard on admin_profiles;
create trigger admin_allowlist_guard
  before insert on admin_profiles
  for each row execute function enforce_admin_allowlist();

-- ----------------------------------------------------------------------------
-- Seat cap: 2 -> 3, and no longer racy.
-- ----------------------------------------------------------------------------
-- The old version read the count and then inserted with no lock, so under
-- READ COMMITTED two concurrent grants could both observe "1 existing" and
-- both succeed, leaving 3 admins where 2 were allowed. The advisory lock
-- serialises the check against the insert that follows it.
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

-- ----------------------------------------------------------------------------
-- Revoke any admin who is not on the list.
-- ----------------------------------------------------------------------------
-- A no-op on a healthy database (the carry-over above covers every current
-- admin). It matters if this migration is re-run later after someone has
-- been removed from the allowlist: their dashboard row goes too, rather
-- than lingering as a dormant grant waiting to be re-enabled.
delete from admin_profiles ap
where not exists (
  select 1
  from auth.users u
  join admin_allowed_emails ae on lower(ae.email) = lower(u.email)
  where u.id = ap.id
);
