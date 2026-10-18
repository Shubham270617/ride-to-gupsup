-- ============================================================================
-- Migration 023 — Make the admin allowlist work for every listed admin
-- ============================================================================
-- Run AFTER 022, in the Supabase SQL Editor. Safe to re-run. The only thing
-- it deletes is an exact duplicate on the allowlist (same address listed
-- twice in different case) — one copy of each address always stays.
--
-- Two things could stop a correctly listed admin from getting in:
--
--   1. An address saved with capitals or spaces (e.g. typed by hand in SQL
--      as ' Simran@Gmail.com'). The database compared case-blind, but the
--      login check compared exactly, so it said "not authorised". The login
--      check is now case-blind too (api/auth/claim-bootstrap-admin.js); this
--      also cleans the stored addresses and keeps new ones clean.
--
--   2. An account with no row in `profiles`. An admin seat
--      (admin_profiles) must point at a profiles row, so for such an account
--      the grant always failed. The login check now creates the row if it is
--      missing; this fills it in now for anyone already on the allowlist.
-- ============================================================================

-- 1. Store allowlisted addresses trimmed and lower-cased.
--    If the same address is on the list more than once in different case,
--    keep the oldest entry and drop the others first, so the clean-up below
--    can't collide on the primary key.
delete from admin_allowed_emails a
using admin_allowed_emails b
where lower(trim(a.email)) = lower(trim(b.email))
  and (b.created_at, b.email) < (a.created_at, a.email);

update admin_allowed_emails
set email = lower(trim(email))
where email <> lower(trim(email));

create or replace function normalize_admin_allowed_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists admin_allowed_emails_normalize on admin_allowed_emails;
create trigger admin_allowed_emails_normalize
  before insert or update on admin_allowed_emails
  for each row execute function normalize_admin_allowed_email();

-- 2. Make sure every allowlisted account that exists has a profiles row.
insert into profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
join admin_allowed_emails ae on ae.email = lower(u.email)
where not exists (select 1 from profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Check where things stand (read-only — run this any time):
--
--   select ae.email,
--          u.id is not null           as has_account,
--          u.email_confirmed_at is not null as email_confirmed,
--          p.id is not null           as has_profile,
--          ap.id is not null          as has_admin_seat
--   from admin_allowed_emails ae
--   left join auth.users u      on lower(u.email) = ae.email
--   left join profiles p        on p.id = u.id
--   left join admin_profiles ap on ap.id = u.id
--   order by ae.created_at;
--
-- Every admin needs a row here. has_account = false means they haven't
-- signed up yet; email_confirmed = false means their email confirmation is
-- still pending (only matters while "Confirm email" is on in Supabase);
-- has_admin_seat becomes true the first time they log in at /admin/login.
-- ----------------------------------------------------------------------------
