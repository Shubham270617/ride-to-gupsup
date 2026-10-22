-- ============================================================================
-- Migration 029 — Admins are 3 fixed email addresses
-- ============================================================================
-- Run AFTER 027 and 028, in the Supabase SQL Editor. Safe to re-run.
--
-- Replaces the "first 3 people to sign in at /admin/login" rule (024).
-- Only these accounts can be admins, and only once their email is verified
-- (Google sign-in, or the confirmation link for an email/password account):
--
--   simranbaghelgame@gmail.com
--   shub88510@gmail.com
--   wheelikx@gmail.com
--
-- The same list is in api-lib/adminEmails.js (used by the server) and in
-- supabase/schema.sql. Change all three together.
--
-- * is_admin() — used by every admin-only RLS policy — now also requires
--   the account's verified email to be on the list.
-- * admin_email_guard refuses an admin_profiles row for any other account,
--   whichever way it is inserted.
-- * DELETES the admin_profiles rows of accounts not on the list, so they
--   lose admin access. Their member accounts are untouched. (027 must run
--   first: it lets Ridge volunteer assignments survive an admin's removal.)
--
-- The 3-seat cap trigger from 024 stays; with 3 emails it can't be reached.
-- ============================================================================

create or replace function public.admin_email_allowed(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(p_email, ''))) = any (array[
    'simranbaghelgame@gmail.com',
    'shub88510@gmail.com',
    'wheelikx@gmail.com'
  ]);
$$;

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
      and u.email_confirmed_at is not null
      and public.admin_email_allowed(u.email)
  );
$$;

create or replace function enforce_admin_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from auth.users u
    where u.id = new.id
      and u.email_confirmed_at is not null
      and public.admin_email_allowed(u.email)
  ) then
    raise exception 'Only the RTG admin email addresses can be admins.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists admin_email_guard on admin_profiles;
create trigger admin_email_guard
  before insert or update on admin_profiles
  for each row execute function enforce_admin_email();

-- Remove admin access from everyone not on the list.
delete from admin_profiles ap
where not exists (
  select 1 from auth.users u
  where u.id = ap.id and public.admin_email_allowed(u.email)
);

-- Check who the admins are now (read-only):
--
--   select u.email, u.email_confirmed_at is not null as verified, ap.created_at
--   from admin_profiles ap join auth.users u on u.id = ap.id
--   order by ap.created_at;
