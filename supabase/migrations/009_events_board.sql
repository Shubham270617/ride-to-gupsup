-- ============================================================================
-- Migration 009 — Events page board: categories + accent colour
-- ============================================================================
-- Run AFTER 008, in the Supabase SQL Editor. Safe to re-run.
--
-- The Events page is now an "event board" drawn entirely from the events
-- table (it used to be fixed text in code). Two schema changes support it:
--
-- 1. events.event_status — becomes the event's CATEGORY on that board (its
--    filter pill): 'Flagship', 'Community', 'Virtual' or 'Past'.
--    It used to be 'Flagship' / 'Upcoming' / 'Past' (the three sections of
--    the old Events page). Existing 'Upcoming' rows become 'Community';
--    'Flagship' and 'Past' rows are unchanged. "Past" still keeps an event
--    out of the Home page's Upcoming Events slides.
--
-- 2. events.tone — the accent colours of the event's cards: sunset,
--    electric, trail, blue, warm, mint or future. Optional — an event
--    without one is given the next colour in that order.
--
-- 3. Deletes saved wording for the OLD Events page's three section headings
--    ("text.events.featured/upcoming/past.*"), which nothing reads any more.
--    The page's wording now lives under "text.events.<field>"
--    (Admin -> Site Content -> Events).
--
-- 4. Starter events — ONLY if the events table is completely empty: the
--    seven items of the reference board, so the page isn't blank on a new
--    install. The first three are marked "Featured on homepage". If you
--    already have events, nothing is inserted.
-- ============================================================================

alter table events add column if not exists tone text;

comment on column events.tone is 'Accent colours on the Events page: sunset | electric | trail | blue | warm | mint | future. Optional.';
comment on column events.event_status is 'Category on the Events page board (its filter pill): Flagship | Community | Virtual | Past. Past also hides the event from Home''s Upcoming Events.';

alter table events drop constraint if exists events_status_check;
update events set event_status = 'Community' where event_status = 'Upcoming';
alter table events alter column event_status set default 'Community';
alter table events add constraint events_status_check check (event_status in ('Flagship', 'Community', 'Virtual', 'Past'));

delete from site_settings
where key like 'text.events.featured.%'
   or key like 'text.events.upcoming.%'
   or key like 'text.events.past.%';

insert into events
  (slug, title, event_date, event_type, event_status, tone, description, home_pills, home_title_accent,
   highlight_label, highlight_title, highlight_text, cover_image_url, featured, sort_order)
select * from (values
  ('rtg-mtb-challenge-2026', 'RTG MTB Challenge 2026', 'Coming Soon', 'Flagship MTB Race', 'Flagship', 'sunset',
   'A Delhi NCR mountain-bike race concept built around endurance, handling, challenge and the wider RTG community.',
   'Delhi NCR, 30–50 KM Concept, Date TBA', 'Challenge 2026',
   'Highlights', 'Overall • Pro • Age Categories', 'Helmet mandatory, hydration support, timing, volunteers and podium recognition.',
   '/images/rtg-reference/rtg-adventure.jpg', true, 1),
  ('endurance-league-vol-2', 'Endurance League Vol. 2', 'Target • Jan 2027', 'Pan-India • Virtual', 'Virtual', 'electric',
   'The next edition of RTG''s points-driven cycling and running challenge, designed for participation from anywhere.',
   'Pan-India, Cycling + Running, Target Jan 2027', 'League Vol. 2',
   'Why It Matters', 'Competition with community at the center', 'Leaderboard-driven, exciting and built for participation across cities.',
   '/images/rtg-reference/rtg-community.jpg', true, 2),
  ('fun-trail-quest', 'Fun Trail Quest', 'Target • Feb 2027', 'Trail Experience', 'Flagship', 'trail',
   'A return of the annual trail-meets-fun experience with movement, tasks and a community-first format.',
   'Trail Experience, Movement + Tasks, Target Feb 2027', 'Quest',
   'RTG Feel', 'Move • Connect • Challenge • Explore', 'Perfect for members who love something a little different from a regular session.',
   '/images/rtg-reference/rtg-running.jpg', true, 3),
  ('ridge-repeats', 'Ridge Repeats', 'Saturdays', 'Weekly Training', 'Community', 'blue',
   'Five loops, one rider and one simple idea: improve against your own previous loop.',
   'Delhi NCR, 5 × 9.15 KM Loops, Saturdays', null, null, null, null,
   '/images/rtg-reference/rtg-cycling.jpg', false, 4),
  ('brick-and-burn', 'Brick & Burn', 'Fridays', 'Weekly Training', 'Community', 'warm',
   'A combined cycling and running session with mobility work to build multi-sport consistency.',
   'Delhi NCR, Ride + Run + Mobility, Fridays', null, null, null, null,
   '/images/rtg-reference/rtg-running.jpg', false, 5),
  ('long-rides-and-escapes', 'Long Rides + Escapes', 'Announced Weekly', 'Community', 'Community', 'mint',
   'Long rides, MTB mornings and trail experiences that change with the weekend and location.',
   'Weekend, Ride + MTB + Trail, Announced Weekly', null, null, null, null,
   '/images/rtg-reference/rtg-adventure2.jpg', false, 6),
  ('more-rtg-races', 'More RTG Races', 'In Development', 'Future Format', 'Flagship', 'future',
   'Road, duathlon and other formats can enter the calendar once the concept, owner and execution plan are ready.',
   'Future Format, Road + Duathlon, In Development', null, null, null, null,
   '/images/rtg-reference/rtg-adventure.jpg', false, 7)
) as starter
where not exists (select 1 from events);
