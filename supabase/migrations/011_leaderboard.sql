-- ============================================================================
-- Migration 011 — Leaderboard page: its own six tables
-- ============================================================================
-- Run AFTER 010, in the Supabase SQL Editor. Safe to re-run.
--
-- The Leaderboard page (/leaderboard) is now drawn entirely from six new
-- tables, each with its own admin screen:
--
-- 1. leaderboard_challenges — the events / challenges that have a board.
--    Each one is a choice in the page's "Event / Challenge" dropdown.
--    Admin -> Leaderboard — Challenges.
--
-- 2. leaderboard_sports — the sports (Cycling, Running …). Each one is a
--    filter pill, a slice of the "Sport Mix" ring and its colour.
--    Admin -> Leaderboard — Sports.
--
-- 3. leaderboard_age_groups — the age brackets (Under 25, 26–40 …). Each one
--    is a filter pill and a bar of the "Age Distribution" card.
--    Admin -> Leaderboard — Age Groups.
--
-- 4. leaderboard_entries — one row per athlete per challenge: sessions,
--    distance, consistency, points and the checkpoint scores that draw the
--    trend lines. Every number, ranking, chart and total on the page is
--    worked out from these rows.
--    Admin -> Leaderboard — Athletes.
--
-- 5. ridge_sessions — the Ridge Repeats sessions in the "Session" dropdown.
--    Admin -> Ridge Repeats — Sessions.
--
-- 6. ridge_results — one row per rider per session: their loop times and
--    score. Average loop, improvement and completion are worked out from the
--    loop times.
--    Admin -> Ridge Repeats — Results.
--
-- The page's headings, labels and paragraphs live in site_settings under
-- "text.leaderboard.<field>" (Admin -> Site Content -> Leaderboard).
--
-- What this REPLACES — and removes:
--   * the 'leaderboardHero' site photo (the page no longer has one) . DELETED
-- The Strava totals (leaderboard_stats / strava_activities) are NOT touched —
-- members still see their own totals on their dashboard. The public
-- Leaderboard page no longer lists them; it shows the rows of
-- leaderboard_entries instead.
-- ============================================================================

-- 1. Tables ------------------------------------------------------------------

create table if not exists leaderboard_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_sports (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  filter_label text,
  color text not null default '#6568ff',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column leaderboard_sports.filter_label is 'Optional longer wording for the filter pill (e.g. Mixed / Events). Falls back to name.';
comment on column leaderboard_sports.color is 'Hex colour (#rrggbb) of this sport''s slice of the Sport Mix ring.';

create table if not exists leaderboard_age_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  filter_label text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column leaderboard_age_groups.filter_label is 'Optional shorter wording for the filter pill (e.g. U25). Falls back to name.';

create table if not exists leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  athlete_name text not null,
  city text,
  challenge_slug text references leaderboard_challenges(slug) on update cascade on delete set null,
  sport_slug text references leaderboard_sports(slug) on update cascade on delete set null,
  gender text check (gender in ('Male', 'Female', 'Other')),
  age_group_slug text references leaderboard_age_groups(slug) on update cascade on delete set null,
  sessions int not null default 0,
  distance_km numeric not null default 0,
  consistency int not null default 0 check (consistency between 0 and 100),
  points int not null default 0,
  trend text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column leaderboard_entries.consistency is 'Completion index, 0–100 (%).';
comment on column leaderboard_entries.trend is 'Checkpoint scores, oldest first, comma-separated (e.g. 66, 72, 79, 86, 92, 100). Draws the athlete''s trend line and the Momentum chart.';

create index if not exists leaderboard_entries_challenge_idx on leaderboard_entries (challenge_slug);

create table if not exists ridge_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  loop_count int not null default 5 check (loop_count > 0),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column ridge_sessions.loop_count is 'Loops a rider is meant to complete — a rider''s completion % is their recorded loops out of this.';

create table if not exists ridge_results (
  id uuid primary key default gen_random_uuid(),
  athlete_name text not null,
  session_slug text references ridge_sessions(slug) on update cascade on delete cascade,
  loop_times text,
  improvement_pct numeric,
  score numeric not null default 0,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column ridge_results.loop_times is 'Loop times in order, mm:ss, comma-separated (e.g. 21:16, 20:58, 20:29).';
comment on column ridge_results.improvement_pct is 'Optional. Improvement in %; when empty it is worked out from the first and last loop time.';

create index if not exists ridge_results_session_idx on ridge_results (session_slug);

-- 2. Row level security — public can read published rows, admins write.

do $$
declare
  t text;
begin
  foreach t in array array['leaderboard_challenges', 'leaderboard_sports', 'leaderboard_age_groups', 'leaderboard_entries', 'ridge_sessions', 'ridge_results']
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

-- 3. Starter challenges, sports and age groups — ONLY if there are none yet.

insert into leaderboard_challenges (slug, name, sort_order)
select * from (values
  ('endurance', 'Endurance League Vol. 2', 1),
  ('mtb', 'RTG MTB Challenge 2026', 2),
  ('trail', 'Fun Trail Quest', 3),
  ('community', 'Community Challenge Series', 4)
) as starter
where not exists (select 1 from leaderboard_challenges);

insert into leaderboard_sports (slug, name, filter_label, color, sort_order)
select * from (values
  ('cycling', 'Cycling', null, '#17c9ff', 1),
  ('running', 'Running', null, '#ff4fa3', 2),
  ('walking', 'Walking', null, '#a7f03e', 3),
  ('mixed', 'Mixed', 'Mixed / Events', '#6568ff', 4)
) as starter
where not exists (select 1 from leaderboard_sports);

insert into leaderboard_age_groups (slug, name, filter_label, sort_order)
select * from (values
  ('under-25', 'Under 25', 'U25', 1),
  ('26-40', '26–40', null, 2),
  ('41-55', '41–55', null, 3),
  ('55-plus', '55+', null, 4)
) as starter
where not exists (select 1 from leaderboard_age_groups);

-- 4. SAMPLE athletes — ONLY if the board is still empty, so the page isn't
--    blank on day one. These are made-up people from the design reference,
--    NOT real members: replace or delete them in Admin -> Leaderboard —
--    Athletes before the page goes public (the page labels itself "Demo
--    Data" until that wording is changed in Site Content -> Leaderboard).

insert into leaderboard_entries
  (athlete_name, city, challenge_slug, sport_slug, gender, age_group_slug, sessions, distance_km, consistency, points, trend, sort_order)
select
  s.athlete_name, s.city,
  (select c.slug from leaderboard_challenges c where c.slug = s.challenge_slug),
  (select sp.slug from leaderboard_sports sp where sp.slug = s.sport_slug),
  s.gender,
  (select a.slug from leaderboard_age_groups a where a.slug = s.age_group_slug),
  s.sessions, s.distance_km, s.consistency, s.points, s.trend, s.sort_order
from (values
  ('Aarav Mehta', 'Delhi NCR', 'endurance', 'cycling', 'Male', '26-40', 18, 822, 94, 1284, '66, 72, 79, 86, 92, 100', 1),
  ('Meera Sethi', 'Chandigarh', 'endurance', 'running', 'Female', '26-40', 20, 214, 97, 1238, '62, 70, 78, 85, 94, 99', 2),
  ('Kabir Arora', 'Delhi NCR', 'mtb', 'cycling', 'Male', 'under-25', 14, 486, 91, 1176, '60, 68, 75, 80, 89, 96', 3),
  ('Tanya Rao', 'Noida', 'trail', 'running', 'Female', 'under-25', 16, 168, 95, 1132, '58, 67, 73, 82, 91, 97', 4),
  ('Vikram Nair', 'Delhi NCR', 'community', 'mixed', 'Male', '41-55', 22, 612, 90, 1096, '64, 69, 76, 83, 87, 93', 5),
  ('Ishita Bedi', 'Delhi NCR', 'endurance', 'walking', 'Female', '41-55', 25, 136, 98, 1058, '69, 75, 80, 84, 91, 98', 6),
  ('Rohan Gill', 'Chandigarh', 'mtb', 'cycling', 'Male', '26-40', 15, 522, 88, 1024, '57, 66, 72, 78, 84, 90', 7),
  ('Naina Kapoor', 'Delhi NCR', 'community', 'mixed', 'Female', '26-40', 17, 378, 92, 998, '61, 65, 72, 79, 86, 92', 8),
  ('Dev Malhotra', 'Dehradun', 'trail', 'walking', 'Male', '55-plus', 18, 122, 96, 962, '68, 70, 76, 82, 88, 95', 9),
  ('Riya Sen', 'Delhi NCR', 'endurance', 'running', 'Female', '26-40', 18, 192, 90, 944, '55, 63, 71, 79, 85, 91', 10),
  ('Aditya Khanna', 'Noida', 'community', 'cycling', 'Male', '41-55', 13, 542, 86, 918, '54, 60, 67, 74, 80, 87', 11),
  ('Simran Kaur', 'Delhi NCR', 'mtb', 'cycling', 'Female', '26-40', 12, 404, 89, 901, '51, 59, 66, 73, 81, 89', 12),
  ('Arjun Bose', 'Chandigarh', 'trail', 'running', 'Male', '26-40', 14, 156, 87, 872, '50, 57, 65, 72, 79, 86', 13),
  ('Pooja Menon', 'Delhi NCR', 'community', 'walking', 'Female', '41-55', 21, 115, 93, 846, '60, 64, 69, 76, 84, 92', 14),
  ('Harsh Vohra', 'Noida', 'endurance', 'cycling', 'Male', 'under-25', 12, 448, 84, 822, '46, 55, 61, 69, 76, 83', 15),
  ('Ananya Shah', 'Dehradun', 'trail', 'mixed', 'Female', 'under-25', 15, 174, 88, 804, '48, 54, 62, 70, 77, 85', 16),
  ('Sanjay Oberoi', 'Delhi NCR', 'community', 'walking', 'Male', '55-plus', 19, 104, 91, 775, '53, 58, 63, 70, 79, 88', 17),
  ('Kavya Joshi', 'Jaipur', 'endurance', 'running', 'Female', '41-55', 16, 166, 85, 746, '45, 51, 58, 66, 73, 82', 18)
) as s (athlete_name, city, challenge_slug, sport_slug, gender, age_group_slug, sessions, distance_km, consistency, points, trend, sort_order)
where not exists (select 1 from leaderboard_entries);

-- 5. Starter Ridge Repeats sessions, and SAMPLE results — ONLY if there are
--    none yet. Same as step 4: the results are made-up, replace or delete
--    them in Admin -> Ridge Repeats — Results.

insert into ridge_sessions (slug, name, loop_count, sort_order)
select * from (values
  ('overall', 'Overall Progress', 5, 1),
  ('session-a', 'Sample Session A', 5, 2),
  ('session-b', 'Sample Session B', 5, 3)
) as starter
where not exists (select 1 from ridge_sessions);

insert into ridge_results (athlete_name, session_slug, loop_times, score, sort_order)
select s.athlete_name, r.slug, s.loop_times, s.score, s.sort_order
from (values
  ('Athlete R01', 'overall', '21:16, 20:58, 20:29, 20:04, 19:42', 34.6, 1),
  ('Athlete R02', 'overall', '21:44, 21:26, 20:58, 20:34, 20:10', 31.9, 2),
  ('Athlete R03', 'overall', '22:10, 21:52, 21:24, 21:01, 20:40', 29.7, 3),
  ('Athlete R04', 'overall', '22:40, 22:19, 21:55, 21:28', 25.4, 4),
  ('Athlete R05', 'overall', '23:18, 22:55, 22:29, 22:11', 22.1, 5),
  ('Athlete R01', 'session-a', '21:30, 21:12, 20:49, 20:28, 20:01', 18.4, 6),
  ('Athlete R03', 'session-a', '22:22, 22:00, 21:39, 21:17, 21:05', 16.8, 7),
  ('Athlete R02', 'session-a', '21:52, 21:39, 21:20, 21:01, 20:47', 15.9, 8),
  ('Athlete R05', 'session-a', '23:30, 23:15, 22:59, 22:36', 12.7, 9),
  ('Athlete R02', 'session-b', '21:25, 21:08, 20:44, 20:19, 19:53', 17.8, 10),
  ('Athlete R01', 'session-b', '21:02, 20:46, 20:25, 20:06, 19:45', 16.2, 11),
  ('Athlete R04', 'session-b', '22:40, 22:19, 21:55, 21:28', 14.4, 12),
  ('Athlete R03', 'session-b', '22:00, 21:49, 21:29, 21:16, 21:03', 13.1, 13)
) as s (athlete_name, session_slug, loop_times, score, sort_order)
join ridge_sessions r on r.slug = s.session_slug
where not exists (select 1 from ridge_results);

-- 6. Remove what the new page replaces. THIS DELETES DATA: the Leaderboard
--    page's old hero photo setting (the page no longer has a photo hero).

delete from site_images where key = 'leaderboardHero';
