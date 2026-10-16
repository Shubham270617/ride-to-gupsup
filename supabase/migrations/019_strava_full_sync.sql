-- ============================================================================
-- Migration 019 — Strava: sync an athlete's COMPLETE history, not 60 rides
-- ============================================================================
-- Run AFTER 018, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- The problem this fixes:
--   The old backfill pulled a hard maximum of 60 activities per member
--   (2 pages x 30) at the moment they connected Strava, and nothing ever
--   went back for the rest. Webhooks only cover activity recorded AFTER
--   connecting. So an athlete with 5,000+ km of riding showed ~539 km —
--   their 60 most recent rides and nothing else.
--
-- What this adds:
--   profiles.strava_synced_through  how far BACK in time the history walk
--                                   has reached for this member. The walk
--                                   pages backwards and saves this after
--                                   every page, so a run that times out
--                                   resumes instead of starting over.
--   profiles.strava_backfill_done   true once we've walked past their very
--                                   first ever activity. Until then the
--                                   nightly cron keeps advancing them.
--
-- Both default to "not yet synced" for every existing member, which is
-- deliberate: it queues everyone who connected under the old capped
-- backfill to be re-walked in full. Re-walking is safe — activity rows
-- upsert on strava_activity_id, so nothing is duplicated.
--
-- The matching code is api-lib/stravaSync.js (advanceStravaBackfill) and
-- api/cron/strava-backfill.js.
-- ============================================================================

alter table if exists profiles
  add column if not exists strava_synced_through timestamptz;

alter table if exists profiles
  add column if not exists strava_backfill_done boolean not null default false;

comment on column profiles.strava_synced_through is
  'Oldest point the Strava history walk has reached for this member. Resume cursor — see api-lib/stravaSync.js.';
comment on column profiles.strava_backfill_done is
  'True once the walk has passed this member''s first ever Strava activity. The backfill cron skips them after that.';

-- Lets the cron find "who still needs walking" without scanning every member.
create index if not exists profiles_strava_backfill_pending_idx
  on profiles (strava_backfill_done)
  where strava_refresh_token is not null;

-- Anyone who connected Strava before this migration was capped at 60
-- activities, so their history is incomplete by definition. Queue them all.
update profiles
set strava_backfill_done = false,
    strava_synced_through = null
where strava_refresh_token is not null;

-- The leaderboard is derived entirely from strava_activities by
-- recomputeLeaderboard(), which the backfill calls as it goes — so the
-- totals correct themselves as the walk progresses. Nothing to do here.
