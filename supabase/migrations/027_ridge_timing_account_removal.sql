-- ============================================================================
-- Migration 027 — Removing an admin or deleting an account works with Ridge
-- ============================================================================
-- Run AFTER Randeep's four Ridge migrations, in the Supabase SQL Editor:
--   20261020211425_native_ridge_workspace.sql
--   20261021152152_ridge_volunteer_timing_access.sql
--   20261021170333_ridge_scoped_code_access_and_testing_dates.sql
--   20261021174900_session_timing_codes.sql
-- Safe to re-run. Deletes nothing now.
--
-- ridge_timing_assignments (who may time which Ridge session) linked to
-- admins and accounts with no rule for what happens when they go:
--
-- * assigned_by -> admin_profiles: revoking an admin in Admin -> Members
--   (which frees their seat for the next person) failed with a foreign-key
--   error once that admin had assigned a volunteer. Now the assignment stays
--   and assigned_by becomes empty.
-- * user_id -> auth.users: a volunteer deleting their own account
--   (Dashboard -> Delete account) failed the same way. Now that volunteer's
--   timing assignments are deleted with the account.
-- ============================================================================

alter table public.ridge_timing_assignments alter column assigned_by drop not null;

alter table public.ridge_timing_assignments
  drop constraint if exists ridge_timing_assignments_assigned_by_fkey;
alter table public.ridge_timing_assignments
  add constraint ridge_timing_assignments_assigned_by_fkey
  foreign key (assigned_by) references public.admin_profiles(id) on delete set null;

alter table public.ridge_timing_assignments
  drop constraint if exists ridge_timing_assignments_user_id_fkey;
alter table public.ridge_timing_assignments
  add constraint ridge_timing_assignments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
