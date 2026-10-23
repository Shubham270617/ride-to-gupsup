-- ============================================================================
-- Migration 032 — Remove the made-up (sample) athletes from the Strava board
-- ============================================================================
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- Migration 016 filled Admin -> Lab — Manual Activities with ~13,000 made-up
-- activities for 18 fake athletes ("Aarav S.", "Naina J." …, is_sample =
-- true, dated from 500 days ago to 250 days ahead) so the /lab/strava board
-- wasn't empty on day one. This deletes ONLY those sample rows.
--
-- Kept: every activity an admin typed in by hand (is_sample = false), all
-- Strava data, members, sports and age categories.
-- 016's sample block is switched off, so re-running it won't bring them back.
-- ============================================================================

-- How many will go (read-only):
select count(*) as sample_rows_to_delete from lab_activities where is_sample;

delete from lab_activities where is_sample;

-- Check: sample_rows should be 0; real_rows is what stays.
select
  count(*) filter (where is_sample)     as sample_rows,
  count(*) filter (where not is_sample) as real_rows
from lab_activities;
