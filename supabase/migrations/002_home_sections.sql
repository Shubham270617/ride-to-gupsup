-- ============================================================================
-- Migration 002 — Home page sections: "Why RTG" cards + "Ways to Move" cards
-- ============================================================================
-- Gives the two Home sections directly under the hero their own tables, so
-- each is managed on its own admin screen instead of living in code:
--
--   home_why_reasons — the auto-scrolling card stack beside "More Than
--                      Miles. More Than Sport." (Admin -> Why RTG Cards)
--   home_ways        — the one-at-a-time photo cards beside "More Ways to
--                      Move Together." (Admin -> Ways to Move Cards)
--
-- The headings/paragraphs/button of both sections are single values, not
-- lists, so they stay in the existing site_settings table (Admin -> Site
-- Content -> Home) under "text.home.why.*" / "text.home.ways.*".
--
-- Safe to re-run: tables are `if not exists`, policies are dropped and
-- recreated, and the starter rows are only inserted into an empty table.
-- Run in the Supabase SQL Editor. (supabase/schema.sql contains the same
-- definitions for fresh installs.)
-- ============================================================================

create table if not exists home_why_reasons (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'training',
  pill text,
  title text not null,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column home_why_reasons.icon is 'Which line-art icon to draw: training | community | running | cycling | consistency | recognition | adventure | memories.';
comment on column home_why_reasons.pill is 'Small category label above the card title, e.g. "Weekly Training".';

create table if not exists home_ways (
  id uuid primary key default gen_random_uuid(),
  kicker text,
  title text not null,
  description text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column home_ways.kicker is 'Small orange line above the card title, e.g. "Run with RTG".';
comment on column home_ways.link_url is 'Where the card goes when clicked — a page on this site, e.g. /weekly-rides.';

-- Same RLS pattern as every other content table: anyone can read published
-- rows, only admins (rows in admin_profiles) can write.
do $$
declare
  t text;
begin
  foreach t in array array['home_why_reasons', 'home_ways']
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "%s public read" on %I', t, t);
    execute format('create policy "%s public read" on %I for select using (published = true or is_admin())', t, t);

    execute format('drop policy if exists "%s admin insert" on %I', t, t);
    execute format('create policy "%s admin insert" on %I for insert with check (is_admin())', t, t);

    execute format('drop policy if exists "%s admin update" on %I', t, t);
    execute format('create policy "%s admin update" on %I for update using (is_admin())', t, t);

    execute format('drop policy if exists "%s admin delete" on %I', t, t);
    execute format('create policy "%s admin delete" on %I for delete using (is_admin())', t, t);
  end loop;
end $$;

-- Starter rows — the same cards the site shows before any exist, so the
-- admin screens open with something to edit instead of an empty list.
insert into home_why_reasons (icon, pill, title, description, sort_order)
select * from (values
  ('training',    'Weekly Training', 'Train Together',     'Structured weekly sessions designed for real progress.',        1),
  ('community',   'Community',       'Find Your People',   'No pace is too slow. Every level belongs here.',                2),
  ('running',     'Running',         'Run Stronger',       'From easy runs to trail mornings and event-day confidence.',    3),
  ('cycling',     'Cycling Skills',  'Climb Better',       'Build pacing, strength and confidence for longer rides.',       4),
  ('consistency', 'Consistency',     'Stay Consistent',    'Weekly rhythm that keeps motivation alive and habits strong.',  5),
  ('recognition', 'Recognition',     'Earn Your Progress', 'Challenges, milestones and rewards that make effort visible.',  6),
  ('adventure',   'Adventure',       'Adventure More',     'Trails, long rides and new routes that keep things exciting.',  7),
  ('memories',    'Memories',        'Create Stories',     'Rides, runs and shared moments that stay with you for life.',   8)
) as starter
where not exists (select 1 from home_why_reasons);

insert into home_ways (kicker, title, description, image_url, link_url, sort_order)
select * from (values
  ('Run with RTG',     'Running',   'Community runs, training, challenges.',          '/images/rtg-reference/rtg-running.jpg',   '/weekly-rides', 1),
  ('Ride with RTG',    'Cycling',   'Group rides, new routes, bigger miles.',         '/images/rtg-reference/rtg-cycling.jpg',   '/weekly-rides', 2),
  ('Explore with RTG', 'Adventure', 'MTB trails, off-road escapes and mountain days.', '/images/rtg-reference/rtg-adventure.jpg', '/events',       3)
) as starter
where not exists (select 1 from home_ways);
