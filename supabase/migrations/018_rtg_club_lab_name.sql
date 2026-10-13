-- ============================================================================
-- Migration 018 — the "Strava Challenge" lab is now called "RTG Club Lab"
-- ============================================================================
-- Run AFTER 016 (and 017), in the Supabase SQL Editor. Safe to re-run.
-- Nothing is deleted. Only the NAME changes: the lab's short code stays
-- 'strava-challenge' (registrations are filed under it) and its page stays
-- /lab/strava.
--
-- Rows an admin has already renamed to something else are left alone.
-- ============================================================================

update lab_programmes set title = 'RTG Club Lab'
where slug = 'strava-challenge' and title = 'Strava Challenge';

update lab_programmes
set about_body = replace(about_body, 'Strava Challenge', 'RTG Club Lab')
where about_body like '%Strava Challenge%';

-- Wording saved from Admin -> Site Content -> Lab that still uses the old name.
update site_settings set value = 'Your RTG Club Lab.'
where key = 'text.lab.accessTitle' and value = 'Your Strava Challenge lab.';

update site_settings
set value = replace(replace(value, 'Strava Challenge', 'RTG Club Lab'), 'STRAVA CHALLENGE', 'RTG CLUB LAB')
where key like 'text.lab.%'
  and (value like '%Strava Challenge%' or value like '%STRAVA CHALLENGE%');
