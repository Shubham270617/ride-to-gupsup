-- ============================================================================
-- Reset Ridge test data — ONE-OFF clean-up, not a migration
-- ============================================================================
-- Run in the Supabase SQL Editor when you want to wipe test riders, test
-- sessions and every timer code, and start fresh.
--
--   !! Do NOT run this after real Ridge results are in (e.g. after Randeep
--   !! imports the history) — it empties ALL riders and sessions.
--
-- Where things live:
--   ridge_workspace            all riders + sessions + lap times (one JSON row)
--   ridge_publication          the copy the website shows
--   ridge_timing_codes         every owner / volunteer code
--   ridge_timing_code_sessions browsers currently signed in with a code
--   ridge_timing_code_rates    wrong-code attempt counters
--   ridge_timing_assignments   volunteer accounts assigned to a session
--   ridge_audit                history of every save — KEPT on purpose: its
--                              version numbers must keep going up (see 031)
--
-- The version numbers are not reset, so saves keep working afterwards.
-- ============================================================================

-- 1. Every timer code, and anyone signed in with one.
delete from public.ridge_timing_code_sessions;
delete from public.ridge_timing_codes;
delete from public.ridge_timing_code_rates;

-- 2. Volunteer accounts assigned to the old test sessions.
delete from public.ridge_timing_assignments;

-- 3. All riders and sessions (empty board, same version numbers).
update public.ridge_workspace
set state = '{"schemaVersion":1,"riders":[],"sessions":[]}', updated_at = now()
where singleton;

update public.ridge_publication
set feed = '{"sessions":[],"results":[],"awards":[],"spotlights":[]}', updated_at = now()
where singleton;

-- Check: everything should be 0.
select
  (select count(*) from public.ridge_timing_codes)                               as codes,
  (select jsonb_array_length(state->'riders') from public.ridge_workspace)      as riders,
  (select jsonb_array_length(state->'sessions') from public.ridge_workspace)    as sessions;
