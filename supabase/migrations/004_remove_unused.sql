-- ============================================================================
-- Migration 004 — Remove what the Home page rebuild left unused
-- ============================================================================
-- Run AFTER 003, in the Supabase SQL Editor. Safe to re-run.
--
-- !! This deletes data. Read the two lists below before running. !!
--
-- 1. weekly_sessions.image_url / tags / steps / highlights
--    These four columns only ever fed Home's "Training Formats" section.
--    That section now reads its own table (home_training_formats, added in
--    003), and nothing else on the site or in the admin uses them. Anything
--    typed into those four fields is discarded; the sessions themselves
--    (day, name, time, location, …) are untouched.
--    If you had filled those fields in, copy what you want to keep into
--    Admin -> Home — Training Formats BEFORE running this.
--    (This replaces the old 001_weekly_sessions_training_detail.sql, which
--    added the columns and has been deleted from the repo.)
--
-- 2. Saved wording for Home sections that no longer exist
--    Rows in site_settings for: the old "This Is RTG" block, the old dark
--    "Why Athletes Join RTG" band, the unused "Weekly Activities" heading,
--    and the old "Upcoming Events" heading. Each was replaced by a new
--    section with its own keys (text.home.why.*, text.home.ways.*,
--    text.home.events.*), so these rows are no longer read by anything.
-- ============================================================================

alter table weekly_sessions drop column if exists image_url;
alter table weekly_sessions drop column if exists tags;
alter table weekly_sessions drop column if exists steps;
alter table weekly_sessions drop column if exists highlights;

delete from site_settings
where key in (
  'text.home.aboutEyebrow',
  'text.home.aboutTitleLine1',
  'text.home.aboutTitleLine2',
  'text.home.aboutBody',
  'text.home.aboutButtonLabel'
)
or key like 'text.home.whyJoin.%'
or key like 'text.home.weeklyActivities.%'
or key like 'text.home.upcomingEvents.%';
