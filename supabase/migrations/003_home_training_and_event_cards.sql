-- ============================================================================
-- Migration 003 — Home page: "Training Formats" showcase + event slide cards
-- ============================================================================
-- 1. home_training_formats — a table of its own for the dark, tabbed
--    "Training Formats" band on Home (Admin -> Home — Training Formats).
--    It used to be pieced together from the first two weekly_sessions rows;
--    that section needs far more than a schedule row holds (two-line
--    headline, tagline, route-map card, right-hand panel), so it gets its
--    own schema. weekly_sessions is left untouched and still drives the
--    Weekly Rides page.
--
-- 2. events — six optional columns for the Home "Upcoming Events" slide
--    (the big card shown for each event marked "Featured on homepage").
--    All nullable: an event without them still gets a complete slide,
--    derived from its date, type and categories.
--
-- Text conventions (plain text, parsed client-side in src/lib/publicData.js,
-- same approach as weekly_sessions.steps/highlights in migration 001):
--   *word*           — drawn in the orange accent colour
--   "A | B | C"      — tagline: big, small, big          (tagline)
--   "a, b, c"        — a row of pills                    (pills, card_stats, home_pills)
--   "Label | Value"  — one per line                      (card_steps, card_meta, panel_rows)
--
-- Safe to re-run. Run in the Supabase SQL Editor after 002.
-- ============================================================================

create table if not exists home_training_formats (
  id uuid primary key default gen_random_uuid(),
  tab_label text not null,
  kicker text,
  title_line1 text not null,
  title_line2 text,
  tagline text,
  description text,
  pills text,
  note text,
  button_label text,
  link_url text,
  image_url text,
  card_label text,
  card_title text,
  card_image_url text,
  card_stats text,
  card_steps text,
  card_meta text,
  panel_rows text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column home_training_formats.image_url is 'Full-width background photo shown while this format''s tab is active.';
comment on column home_training_formats.card_image_url is 'Route map (or any picture) for the left card. Leave empty to show card_steps as a numbered flow instead.';
comment on column home_training_formats.card_steps is 'One step per line as "Label | Value" — only shown when card_image_url is empty.';

do $$
begin
  alter table home_training_formats enable row level security;

  drop policy if exists "home_training_formats public read" on home_training_formats;
  create policy "home_training_formats public read" on home_training_formats for select using (published = true or is_admin());

  drop policy if exists "home_training_formats admin insert" on home_training_formats;
  create policy "home_training_formats admin insert" on home_training_formats for insert with check (is_admin());

  drop policy if exists "home_training_formats admin update" on home_training_formats;
  create policy "home_training_formats admin update" on home_training_formats for update using (is_admin());

  drop policy if exists "home_training_formats admin delete" on home_training_formats;
  create policy "home_training_formats admin delete" on home_training_formats for delete using (is_admin());
end $$;

-- Starter rows — the same two formats the site shows before any exist.
insert into home_training_formats
  (tab_label, kicker, title_line1, title_line2, tagline, description, pills, note, button_label, link_url, image_url,
   card_label, card_title, card_image_url, card_stats, card_steps, card_meta, panel_rows, sort_order)
select * from (values
  (
    'Ridge Repeats',
    'RTG Ridge Repeats • In collaboration with *@iRide2Reach* • Led by *Manish Jayal*',
    'RTG Ridge', 'Repeats.', 'You | vs | You',
    'A signature RTG road-cycling format built around repeat loops, steady effort, pacing, climbs, descents and self-improvement — simple, competitive and addictive.',
    'Delhi NCR, Saturday Mornings, Endurance Focus, Point System',
    'Exclusively under the RTG Membership Program',
    'Explore Now', '/weekly-rides', '/images/rtg-reference/rtg-cycling.jpg',
    'Ridge Loop', 'Talkatora Circuit', '/images/ridge-loop-map.jpg',
    '5 Loops, 9.15 KM Each, ~45 KM Total',
    null,
    E'Start | Talkatora Stadium\nWhen | Saturday • 5:00 AM\nFocus | Pacing • Climbing • Endurance\nStyle | You vs You',
    E'Format | 5 × 9.15 KM Loops\nPoint System | Improvement % • KOM / QOM • PR Points\nRewards & Awards | Monthly, Quarterly, Half-Yearly & Yearly Recognition\nLed By | In collaboration with *@iRide2Reach* — led by *Manish Jayal*',
    1
  ),
  (
    'Brick N Burn',
    'RTG Friday Hybrid Training • Ride → Run → Reset',
    'Brick N', 'Burn.', 'Ride | → | Run',
    'A weekly hybrid session that combines cycling and running in one continuous training format — building endurance, transition confidence and stronger legs.',
    'Friday 5:00 AM, Ride + Run, Mobility Finish, Community Training',
    'Built for consistent weekly progress',
    'Explore Now', '/weekly-rides', '/images/rtg-reference/rtg-running.jpg',
    'Friday Session', 'Brick Flow', null,
    null,
    E'Ride | 60 Min\nTransition | Bike → Run\nRun | 30 Min\nFinish | Mobility',
    E'When | Friday • 5:00 AM\nFormat | Ride + Run\nFocus | Endurance • Adaptation\nFinish | Mobility • Recovery',
    E'Format | 60 Min Ride + 30 Min Run\nTransition | Bike → Run • Keep Moving\nFocus | Endurance • Pacing • Adaptation\nWhy Brick? | Train the body to run strong after the bike',
    2
  )
) as starter
where not exists (select 1 from home_training_formats);

-- Home "Upcoming Events" slide — optional per-event extras.
alter table events add column if not exists home_title_accent text;
alter table events add column if not exists home_pills text;
alter table events add column if not exists highlight_label text;
alter table events add column if not exists highlight_title text;
alter table events add column if not exists highlight_text text;
alter table events add column if not exists secondary_button_label text;
alter table events add column if not exists secondary_button_link text;

comment on column events.home_title_accent is 'The part of the title to draw in the accent gradient on the Home slide, e.g. "Challenge 2026". Must match the end of the title. Optional — the second half of the title is used if empty.';
comment on column events.home_pills is 'Comma-separated pills on the Home slide, e.g. "Nov / Dec 2026, 30–50 KM". Optional — date + categories are used if empty.';
comment on column events.highlight_label is 'Small orange label on the Home slide''s side card, e.g. "Highlights". The side card is hidden when highlight_title and highlight_text are both empty.';
