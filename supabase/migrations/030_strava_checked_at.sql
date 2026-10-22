-- ============================================================================
-- Migration 030 — New Strava rides arrive without an admin pressing Resync
-- ============================================================================
-- Run AFTER 029, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- New rides used to reach the site only through the Strava webhook. Now
-- they are also fetched when the member opens the site (at most every 10
-- minutes) and by the nightly job, for everyone. This column records when a
-- member was last checked, so both can skip someone checked moments ago and
-- the nightly job can start with whoever has waited longest.
-- ============================================================================

alter table profiles
  add column if not exists strava_checked_at timestamptz;

comment on column profiles.strava_checked_at is
  'When this member''s Strava account was last checked for new activities (api-lib/stravaSync.js syncNewActivities).';
