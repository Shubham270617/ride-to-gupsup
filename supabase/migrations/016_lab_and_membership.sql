-- ============================================================================
-- Migration 016 — RTG Lab (replaces the Leaderboard page), the Strava
-- Challenge board, the Ridge Repeats lab and Membership
-- ============================================================================
-- Run AFTER 015, in the Supabase SQL Editor. Safe to re-run.
-- STEP 8 DELETES DATA — read it before running.
--
-- /leaderboard is gone; /lab takes its place:
--   /lab          the hub: hero, reward periods, one card per lab
--   /lab/strava   the Strava Challenge: access window, then the dashboard
--   /lab/ridge    the Ridge Repeats lab, with the session packs below it
--   /membership   RTG Club + Ridge Repeats packs, paid by UPI
--
-- New tables, each with its own admin screen:
--   Lab — Labs                lab_programmes     the lab cards
--   Lab — Reward Periods      lab_periods        the strip + dashboard buttons
--   Lab — Hero Tiles          lab_highlights     the three floating tiles
--   Lab — Principles          lab_principles     "More than a rank"
--   Lab — Access Steps        lab_access_steps   the access window's steps
--   Lab — Sports              lab_sports         Cycling / Running boards
--   Lab — Age Categories      lab_age_groups     the age filter
--   Lab — Manual Activities   lab_activities     hand-typed + sample activities
--   (no screen)               lab_registrations  members who registered
--   Ridge Repeats — Awards    ridge_awards       the six Spotlight awards
--   Ridge Repeats — Spotlight ridge_spotlights   who won them, per session
--   Membership — Plans        membership_plans   Club + session packs, prices
--   Membership — Club Perks   membership_perks
--   Membership — Which One    membership_guides  "Two offers. One community."
--   Membership — Steps        membership_steps
--   Membership — Questions    membership_faqs
--   Membership — Purchases    membership_purchases  what members bought
--
-- Changed tables:
--   ridge_sessions  + session_date (the board is ordered by it)
--   ridge_results   + spotlight_points, adjustment_points, photo_url
--
-- The Strava Challenge board is worked out by the new function
-- lab_strava_board() from the Strava activities of members who REGISTERED
-- for the challenge. strava_activities and profiles stay private.
--
-- Every heading and label of these pages lives in site_settings under
-- "text.lab.<field>", "text.ridge.<field>" and "text.membership.<field>"
-- (Admin -> Site Content -> Lab / Ridge Repeats / Membership).
-- ============================================================================

-- 1. Ridge Repeats tables that already exist: the new columns. (First, so
--    the notes on those columns in step 2 have something to attach to.)

alter table if exists ridge_sessions add column if not exists session_date date;
alter table if exists ridge_results add column if not exists spotlight_points numeric not null default 0;
alter table if exists ridge_results add column if not exists adjustment_points numeric not null default 0;
alter table if exists ridge_results add column if not exists photo_url text;

-- 2. Tables ------------------------------------------------------------------

-- The lab cards of the Lab page.
create table if not exists lab_programmes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  number_label text,
  pill text,
  art_word text,
  eyebrow text,
  description text,
  tags text[],
  tone text not null default 'orange' check (tone in ('orange', 'purple')),
  button_label text,
  link text,
  secondary_label text,
  secondary_link text,
  about_title text,
  about_body text,
  availability_note text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_programmes.slug is 'Members'' registrations are filed under this code. The Strava Challenge must be ''strava-challenge'' — lab_strava_board() and the /lab/strava page look for it.';
comment on column lab_programmes.secondary_link is 'Where the second link goes. Empty = it opens the "About" window (about_title / about_body) instead.';

-- Reward periods: the Lab page's numbered strip and the Strava dashboard's
-- period buttons.
create table if not exists lab_periods (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null default 'week' check (kind in ('week', 'month', 'quarter', 'half_year', 'year')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_periods.kind is 'How the dashboard works out the period''s dates: week (Mon–Sun), month, quarter, half_year or year — all by the calendar.';

-- The three tiles floating around the Lab hero's ring card.
create table if not exists lab_highlights (
  id uuid primary key default gen_random_uuid(),
  icon text,
  label text not null,
  text text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- "More than a rank".
create table if not exists lab_principles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- The numbered steps of the Strava Challenge's access window.
create table if not exists lab_access_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text,
  step_key text not null default 'login' check (step_key in ('login', 'register', 'open')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_access_steps.step_key is 'When the window ticks the step off for a member: login = logged in, register = registered for the challenge, open = registered and Strava connected.';

-- The sports of the Strava Challenge — one board each.
create table if not exists lab_sports (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  strava_types text not null default '',
  speed_min_activities int not null default 3,
  speed_min_avg_km numeric not null default 0,
  show_pace boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_sports.strava_types is 'Strava''s own activity types that count for this sport, comma-separated (e.g. Ride, VirtualRide, GravelRide).';
comment on column lab_sports.speed_min_activities is 'Speed board: an athlete needs at least this many activities in the period …';
comment on column lab_sports.speed_min_avg_km is '… and at least this average distance per activity, in km.';

-- The age categories of the Strava Challenge.
create table if not exists lab_age_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  min_age int,
  max_age int,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_age_groups.max_age is 'Empty = no upper limit (e.g. 50+).';

-- Activities typed in by hand, for athletes who are not on Strava — and the
-- SAMPLE athletes (is_sample) that fill the board until a member registers.
create table if not exists lab_activities (
  id uuid primary key default gen_random_uuid(),
  athlete_name text not null,
  city text,
  gender text check (gender in ('Male', 'Female')),
  age int,
  sport_slug text references lab_sports(slug) on update cascade on delete cascade,
  activity_date date not null,
  distance_km numeric not null default 0,
  moving_minutes numeric not null default 0,
  elevation_m numeric not null default 0,
  is_sample boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column lab_activities.is_sample is 'A made-up athlete. Sample rows are only counted while lab_registrations has no member of the Strava Challenge.';

create index if not exists lab_activities_sport_date_idx on lab_activities (sport_slug, activity_date);

-- Who registered for which lab. Registering is a member's consent to have
-- their Strava totals shown on that lab's public board.
create table if not exists lab_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  programme_slug text not null references lab_programmes(slug) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, programme_slug)
);

-- Ridge Repeats: one row per Saturday session.
create table if not exists ridge_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  session_date date,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column ridge_sessions.session_date is 'The day it was ridden. The board orders sessions by it; a session without a date is not shown.';

-- Ridge Repeats: one row per rider per session. Progress points, completion
-- points and distance are all worked out from loop_times by the page.
create table if not exists ridge_results (
  id uuid primary key default gen_random_uuid(),
  athlete_name text not null,
  session_slug text references ridge_sessions(slug) on update cascade on delete cascade,
  loop_times text,
  spotlight_points numeric not null default 0,
  adjustment_points numeric not null default 0,
  photo_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column ridge_results.loop_times is 'Loop times in order, mm:ss, comma-separated (e.g. 21:16, 20:58, 20:29).';
comment on column ridge_results.spotlight_points is 'Bonus for a Spotlight award — added to the rider''s Ridge points.';
comment on column ridge_results.adjustment_points is 'Organiser correction — added to the rider''s Ridge points (may be negative).';

create index if not exists ridge_results_session_idx on ridge_results (session_slug);

-- Ridge Repeats: the Session Spotlight awards …
create table if not exists ridge_awards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  tone text not null default 'leader' check (tone in ('leader', 'endurance', 'fastest', 'improvement', 'finish', 'consistent')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column ridge_awards.tone is 'The award card''s colour: leader purple, endurance orange, fastest blue, improvement teal, finish pink, consistent green.';

-- … and who won them in each session (one row per rider).
create table if not exists ridge_spotlights (
  id uuid primary key default gen_random_uuid(),
  session_slug text not null references ridge_sessions(slug) on update cascade on delete cascade,
  award_slug text not null references ridge_awards(slug) on update cascade on delete cascade,
  athlete_name text not null,
  metric text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ridge_spotlights_session_idx on ridge_spotlights (session_slug);

-- Membership: the Club membership and the Ridge Repeats session packs.
create table if not exists membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null default 'ridge' check (kind in ('club', 'ridge')),
  sessions int not null default 0,
  price numeric(10, 2) not null default 0,
  club_price numeric(10, 2),
  billing_label text,
  validity_weeks int not null default 0,
  featured boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column membership_plans.sessions is 'Ridge packs: sessions in the pack. The 1-session plan''s price is the full price every pack''s saving is measured against.';
comment on column membership_plans.club_price is 'Optional lower price for a member who holds an active Club membership.';
comment on column membership_plans.validity_weeks is 'Ridge packs: weeks the pack lasts from the first attended session (0 for a single session).';

-- Membership: what the Club gives.
create table if not exists membership_perks (
  id uuid primary key default gen_random_uuid(),
  icon text,
  title text not null,
  text text,
  review_label text,
  review_value text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column membership_perks.review_label is 'Optional: adds a row (review_label / review_value) to the Club''s "Your plan at a glance" window.';

-- Membership: the "Two offers. One community." cards.
create table if not exists membership_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null,
  link_label text,
  link_action text not null default 'plans' check (link_action in ('plans', 'example')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Membership: the three steps of "Your next chapter".
create table if not exists membership_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Membership: the questions.
create table if not exists membership_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Membership: what a member bought. Paid by UPI the same way as a Store
-- order — the member types in the payment reference and an admin verifies
-- it (Admin -> Membership — Purchases). plan_name / amount are a snapshot,
-- so a later price change never rewrites a past purchase.
create table if not exists membership_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_slug text,
  plan_name text not null,
  kind text not null default 'ridge' check (kind in ('club', 'ridge')),
  sessions_total int not null default 0,
  sessions_used int not null default 0,
  amount numeric(10, 2) not null default 0,
  club_rate boolean not null default false,
  customer_name text not null,
  phone text,
  email text,
  utr_reference text,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'active', 'rejected', 'expired', 'cancelled')),
  valid_until date,
  admin_note text,
  created_at timestamptz not null default now()
);

comment on column membership_purchases.user_id is 'Empty for a purchase an admin typed in for someone without an account.';
comment on column membership_purchases.club_rate is 'The Club member price was used.';

create index if not exists membership_purchases_user_idx on membership_purchases (user_id);

-- 3. Row level security — public can read published rows, admins write.

do $$
declare
  t text;
begin
  foreach t in array array['lab_programmes', 'lab_periods', 'lab_highlights', 'lab_principles', 'lab_access_steps', 'lab_sports', 'lab_age_groups', 'lab_activities', 'ridge_sessions', 'ridge_results', 'ridge_awards', 'ridge_spotlights', 'membership_plans', 'membership_perks', 'membership_guides', 'membership_steps', 'membership_faqs']
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

-- 4. Registrations, purchases and the Strava Challenge board ------------------

-- A member can register themselves, see their own registrations and withdraw
-- (which takes them off the board again); admins see everyone's.
alter table lab_registrations enable row level security;

drop policy if exists "lab_registrations own read" on lab_registrations;
create policy "lab_registrations own read" on lab_registrations
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists "lab_registrations own insert" on lab_registrations;
create policy "lab_registrations own insert" on lab_registrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "lab_registrations own delete" on lab_registrations;
create policy "lab_registrations own delete" on lab_registrations
  for delete using (auth.uid() = user_id or is_admin());

-- A member can place a purchase for themselves — always as "payment being
-- verified", never already active, and never for less than the plan costs —
-- and read their own. Only an admin can change or delete one.
alter table membership_purchases enable row level security;

drop policy if exists "membership_purchases own insert" on membership_purchases;
create policy "membership_purchases own insert" on membership_purchases
  for insert with check (
    is_admin()
    or (
      auth.uid() = user_id
      and status = 'pending_verification'
      and sessions_used = 0
      and valid_until is null
      and exists (
        select 1 from membership_plans p
        where p.slug = plan_slug
          and p.published
          and amount >= least(p.price, coalesce(p.club_price, p.price))
      )
    )
  );

drop policy if exists "membership_purchases own read" on membership_purchases;
create policy "membership_purchases own read" on membership_purchases
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists "membership_purchases admin update" on membership_purchases;
create policy "membership_purchases admin update" on membership_purchases
  for update using (is_admin());

drop policy if exists "membership_purchases admin delete" on membership_purchases;
create policy "membership_purchases admin delete" on membership_purchases
  for delete using (is_admin());

-- A Club membership that becomes active without an end date runs for one
-- month. (A Ridge pack's end date depends on the first attended session, so
-- an admin sets it.)
create or replace function membership_purchase_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and new.kind = 'club' and new.valid_until is null then
    new.valid_until := (current_date + interval '1 month')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists membership_purchase_defaults on membership_purchases;
create trigger membership_purchase_defaults
  before insert or update on membership_purchases
  for each row execute function membership_purchase_defaults();

-- The Strava Challenge board: one sport's totals per athlete for a period
-- (p_start up to, not including, p_end), the same for the period before it,
-- and seven running totals through the period for the journey chart.
--
-- It adds up
--   * the synced Strava activities of members who REGISTERED for the
--     challenge (lab_registrations) — nobody else's are ever read, and
--   * the activities typed in by hand (lab_activities); the sample ones only
--     while no member has registered.
-- It runs with the owner's rights so the public page can read these totals
-- without any read access to strava_activities or profiles themselves. Only
-- a name, city, photo, gender and age leave it — never an activity.
create or replace function lab_strava_board(
  p_sport text,
  p_start date,
  p_end date,
  p_prev_start date,
  p_prev_end date
)
returns table (
  athlete_key text,
  athlete_name text,
  city text,
  avatar_url text,
  gender text,
  age int,
  is_sample boolean,
  distance_km numeric,
  moving_hours numeric,
  elevation_m numeric,
  activities int,
  prev_distance_km numeric,
  prev_moving_hours numeric,
  prev_elevation_m numeric,
  prev_activities int,
  series_distance numeric[],
  series_hours numeric[],
  series_elevation numeric[]
)
language sql
stable
security definer
set search_path = public
as $$
  with sport as (
    select string_to_array(replace(coalesce(s.strava_types, ''), ' ', ''), ',') as types
    from lab_sports s
    where s.slug = p_sport and s.published
  ),
  members as (
    select exists (select 1 from lab_registrations r where r.programme_slug = 'strava-challenge') as any_registered
  ),
  acts as (
    select
      'm:' || p.id::text as athlete_key,
      coalesce(nullif(trim(p.full_name), ''), 'RTG Member') as athlete_name,
      p.city,
      p.avatar_url,
      lower(coalesce(p.gender, '')) as gender,
      coalesce(extract(year from age(current_date, p.dob))::int, p.age) as age,
      false as is_sample,
      (sa.start_date at time zone 'Asia/Kolkata')::date as day,
      coalesce(sa.distance_meters, 0) / 1000.0 as km,
      coalesce(sa.moving_time_seconds, 0) / 3600.0 as hours,
      coalesce(sa.elevation_gain_meters, 0) as elev
    from strava_activities sa
    join lab_registrations r on r.user_id = sa.user_id and r.programme_slug = 'strava-challenge'
    join profiles p on p.id = sa.user_id
    cross join sport
    where sa.type = any (sport.types)
    union all
    select
      'x:' || lower(trim(la.athlete_name)),
      la.athlete_name,
      la.city,
      null,
      lower(coalesce(la.gender, '')),
      la.age,
      la.is_sample,
      la.activity_date,
      la.distance_km,
      la.moving_minutes / 60.0,
      la.elevation_m
    from lab_activities la
    cross join members
    where la.published
      and la.sport_slug = p_sport
      and (not la.is_sample or not members.any_registered)
  ),
  cur as (
    select a.athlete_key,
           least(6, ((a.day - p_start) * 7) / greatest(1, p_end - p_start)) as bin,
           a.km, a.hours, a.elev
    from acts a
    where a.day >= p_start and a.day < p_end
  ),
  totals as (
    select c.athlete_key, sum(c.km) as km, sum(c.hours) as hours, sum(c.elev) as elev, count(*)::int as n
    from cur c
    group by c.athlete_key
  ),
  prev as (
    select a.athlete_key, sum(a.km) as km, sum(a.hours) as hours, sum(a.elev) as elev, count(*)::int as n
    from acts a
    where a.day >= p_prev_start and a.day < p_prev_end
    group by a.athlete_key
  ),
  bins as (
    select t.athlete_key, g.bin,
           coalesce(sum(c.km), 0) as km, coalesce(sum(c.hours), 0) as hours, coalesce(sum(c.elev), 0) as elev
    from totals t
    cross join generate_series(0, 6) as g(bin)
    left join cur c on c.athlete_key = t.athlete_key and c.bin = g.bin
    group by t.athlete_key, g.bin
  ),
  running as (
    select b.athlete_key, b.bin,
           sum(b.km) over w as km, sum(b.hours) over w as hours, sum(b.elev) over w as elev
    from bins b
    window w as (partition by b.athlete_key order by b.bin)
  ),
  series as (
    select r.athlete_key,
           array_agg(round(r.km, 2) order by r.bin) as km,
           array_agg(round(r.hours, 4) order by r.bin) as hours,
           array_agg(round(r.elev, 0) order by r.bin) as elev
    from running r
    group by r.athlete_key
  ),
  who as (
    select distinct on (a.athlete_key)
           a.athlete_key, a.athlete_name, a.city, a.avatar_url, a.gender, a.age, a.is_sample
    from acts a
    order by a.athlete_key
  )
  select w.athlete_key, w.athlete_name, w.city, w.avatar_url, w.gender, w.age, w.is_sample,
         round(t.km, 2), round(t.hours, 4), round(t.elev, 0), t.n,
         round(coalesce(p.km, 0), 2), round(coalesce(p.hours, 0), 4), round(coalesce(p.elev, 0), 0), coalesce(p.n, 0),
         s.km, s.hours, s.elev
  from totals t
  join who w on w.athlete_key = t.athlete_key
  join series s on s.athlete_key = t.athlete_key
  left join prev p on p.athlete_key = t.athlete_key;
$$;

revoke all on function lab_strava_board(text, date, date, date, date) from public;
grant execute on function lab_strava_board(text, date, date, date, date) to anon, authenticated;

-- 5. Starter rows — each list ONLY if it is still empty, so re-running this
--    file never brings back a row an admin has deleted.

-- Lab page -------------------------------------------------------------------

insert into lab_programmes
  (slug, title, number_label, pill, art_word, eyebrow, description, tags, tone, button_label, link, secondary_label, secondary_link, about_title, about_body, availability_note, sort_order)
select * from (values
  ('strava-challenge', 'Strava Challenge', '01 / PAN INDIA', 'ONGOING PROGRAMME', 'RIDE. RUN. REPEAT.', 'CYCLING & RUNNING · ALL INDIA',
   'A year-round reason to show up. Track distance, speed and elevation, explore your progress and celebrate top athletes in each category.',
   array['Men & women', 'Age categories', '5 reward periods'], 'orange', 'Enter this lab ↗', '/lab/strava',
   'Explore dashboard →', '/lab/strava?view=board', null, null,
   'Register with your RTG account and connect Strava to appear on the board.', 1),
  ('ridge-repeats', 'Ridge Repeats', '02 / RIDGE REPEATS', 'SESSION + OVERALL', 'SAME LOOP. NEW YOU.', 'CYCLING · PROGRESS OVER PACE',
   'One 9.15 km loop. Up to five chances to improve. Compare lap progress, follow your journey across sessions and celebrate every breakthrough.',
   array['5 loops maximum', 'Rider spotlight', 'Shareable photo cards'], 'purple', 'Enter this lab ↗', '/lab/ridge',
   'About the format ＋', null, 'Same loop. New you.',
   E'Each Ridge Repeats session has a maximum of five loops, each 9.15 km. The focus is progress, alongside lap timing, completion and rider spotlights.\n\n## One session, or the whole journey\nThe lab includes session rankings, overall progress, graphs, rider histories and six spotlight categories. Riders can add a photo to their card and prepare it for Instagram.\n\n## Progress across sessions\nThe overall ranking compares the latest and first qualifying session, using progress averaged over the number of completed loop comparisons. At least two qualifying sessions are needed.',
   'Results are published after every Saturday session.', 2)
) as starter
where not exists (select 1 from lab_programmes);

insert into lab_periods (slug, name, kind, sort_order)
select * from (values
  ('weekly', 'Weekly', 'week', 1),
  ('monthly', 'Monthly', 'month', 2),
  ('quarterly', 'Quarterly', 'quarter', 3),
  ('half-yearly', 'Half-yearly', 'half_year', 4),
  ('yearly', 'Yearly', 'year', 5)
) as starter
where not exists (select 1 from lab_periods);

insert into lab_highlights (icon, label, text, sort_order)
select * from (values
  ('↗', 'GO THE DISTANCE', 'Every km counts.', 1),
  ('ϟ', 'FIND YOUR RHYTHM', 'Your pace. Your progress.', 2),
  ('△', 'RAISE YOUR LIMIT', 'Earn every metre.', 3)
) as starter
where not exists (select 1 from lab_highlights);

insert into lab_principles (title, text, sort_order)
select * from (values
  ('A fair comparison', 'Choose your sport, category and metric. See the rankings that are relevant to you.', 1),
  ('Your journey, visible', 'Progress over time, consistent effort and personal milestones, all in one view.', 2),
  ('Recognition that lasts', 'Weekly to yearly rewards, with published eligibility rules for each challenge.', 3)
) as starter
where not exists (select 1 from lab_principles);

insert into lab_access_steps (title, text, step_key, sort_order)
select * from (values
  ('Log in to RTG', 'One account for your community and your results.', 'login', 1),
  ('Register for this challenge', 'Review the format, categories and participation rules.', 'register', 2),
  ('Open your lab', 'Your access is checked against your registration.', 'open', 3)
) as starter
where not exists (select 1 from lab_access_steps);

insert into lab_sports (slug, name, strava_types, speed_min_activities, speed_min_avg_km, show_pace, sort_order)
select * from (values
  ('cycling', 'Cycling', 'Ride, VirtualRide, EBikeRide, MountainBikeRide, GravelRide', 3, 10, false, 1),
  ('running', 'Running', 'Run, TrailRun, VirtualRun', 3, 3, true, 2)
) as starter
where not exists (select 1 from lab_sports);

insert into lab_age_groups (slug, name, min_age, max_age, sort_order)
select * from (values
  ('18-34', '18–34', 18, 34, 1),
  ('35-49', '35–49', 35, 49, 2),
  ('50-plus', '50+', 50, null::int, 3)
) as starter
where not exists (select 1 from lab_age_groups);

-- SAMPLE athletes for the Strava Challenge — ONLY if there are no manual
-- activities yet, so the dashboard isn't blank on day one. They are made-up
-- people (is_sample = true), NOT members: eighteen athletes with a ride and a
-- run on about half the days from 500 days back to 250 days ahead. The page
-- labels them "sample", and they disappear from the board by themselves the
-- moment the first member registers. To remove them for good, run:
--     delete from lab_activities where is_sample;
insert into lab_activities (athlete_name, city, gender, age, sport_slug, activity_date, distance_km, moving_minutes, elevation_m, is_sample)
select
  a.athlete_name,
  a.city,
  a.gender,
  a.age,
  s.slug,
  d.day,
  round(v.distance, 1),
  round(v.distance / v.speed * 60, 1),
  round(v.distance * (2 + v.seed % 18)),
  true
from (
  select
    n.i,
    (array['Aarav S.', 'Meera K.', 'Kabir M.', 'Ananya R.', 'Vihaan P.', 'Diya S.', 'Ishaan D.', 'Tara B.', 'Arjun N.', 'Leela V.', 'Rohan A.', 'Naina J.', 'Dev K.', 'Maya T.', 'Kunal R.', 'Asha M.', 'Neel P.', 'Ira D.'])[n.i + 1] as athlete_name,
    (array['Delhi', 'Bengaluru', 'Pune', 'Chennai', 'Jaipur', 'Mumbai', 'Kochi', 'Hyderabad', 'Chandigarh'])[n.i % 9 + 1] as city,
    case when n.i % 2 = 1 then 'Female' else 'Male' end as gender,
    (array[26, 39, 57])[n.i / 6 + 1] as age
  from generate_series(0, 17) as n(i)
) a
cross join (values ('cycling', 5), ('running', 13)) as sp(slug, salt)
join lab_sports s on s.slug = sp.slug
cross join lateral (
  select (current_date - 500 + g.n) as day, g.n as idx
  from generate_series(0, 750) as g(n)
) d
cross join lateral (
  select (d.idx * 31 + a.i * 47 + sp.salt * 19) % 997 as seed
) k
cross join lateral (
  select
    k.seed,
    (case when sp.slug = 'cycling' then 18 else 3 end) + (k.seed % (case when sp.slug = 'cycling' then 580 else 130 end)) / 10.0 as distance,
    (case when sp.slug = 'cycling' then 20 else 7 end) + (k.seed % (case when sp.slug = 'cycling' then 120 else 50 end)) / 10.0 + (d.idx / 1000.0) * (a.i % 5) / 5.0 as speed
) v
where (d.idx + a.i + sp.salt) % 7 < 4
  and k.seed % 13 <> 0
  and not exists (select 1 from lab_activities);

-- Ridge Repeats --------------------------------------------------------------

insert into ridge_awards (slug, name, description, tone, sort_order)
select * from (values
  ('session-leader', 'Session Leader', 'The highest progress points of the session.', 'leader', 1),
  ('endurance-standout', 'Endurance Standout', 'Completed every loop of the session with the steadiest effort.', 'endurance', 2),
  ('fastest-lap', 'Fastest Lap', 'The quickest single loop of the session.', 'fastest', 3),
  ('biggest-improvement', 'Biggest Improvement', 'The largest gain between two consecutive loops.', 'improvement', 4),
  ('strong-finish', 'Strong Finish', 'The best final loop compared with the loop before it.', 'finish', 5),
  ('most-consistent', 'Most Consistent', 'The smallest spread between loop times.', 'consistent', 6)
) as starter
where not exists (select 1 from ridge_awards);

-- SAMPLE sessions, results and Spotlight winners — ONLY on a database that
-- has no Ridge Repeats session at all. Made-up riders: replace or delete
-- them in Admin -> Ridge Repeats — Sessions / Results / Spotlight.
do $$
declare
  last_saturday date := current_date - ((extract(dow from current_date)::int + 1) % 7);
begin
  if exists (select 1 from ridge_sessions) then
    return;
  end if;

  insert into ridge_sessions (slug, name, session_date, sort_order) values
    ('sample-session-1', 'Sample Session 1', last_saturday - 21, 1),
    ('sample-session-2', 'Sample Session 2', last_saturday - 14, 2),
    ('sample-session-3', 'Sample Session 3', last_saturday - 7, 3),
    ('sample-session-4', 'Sample Session 4', last_saturday, 4);

  insert into ridge_results (athlete_name, session_slug, loop_times, spotlight_points, sort_order) values
    ('Sample Rider 01', 'sample-session-1', '21:40, 21:22, 21:05', 0, 1),
    ('Sample Rider 02', 'sample-session-1', '22:10, 21:58, 21:49, 21:30', 0, 2),
    ('Sample Rider 03', 'sample-session-1', '23:05, 22:48', 0, 3),
    ('Sample Rider 04', 'sample-session-1', '20:55, 20:50, 20:41, 20:36, 20:20', 0, 4),
    ('Sample Rider 05', 'sample-session-1', '24:10', 0, 5),
    ('Sample Rider 01', 'sample-session-2', '21:30, 21:02, 20:44, 20:31', 0, 6),
    ('Sample Rider 02', 'sample-session-2', '22:02, 21:40, 21:21', 0, 7),
    ('Sample Rider 04', 'sample-session-2', '20:48, 20:44, 20:39, 20:30, 20:12', 0, 8),
    ('Sample Rider 06', 'sample-session-2', '22:40, 22:12, 21:58', 0, 9),
    ('Sample Rider 01', 'sample-session-3', '21:12, 20:40, 20:15, 19:58, 19:40', 0, 10),
    ('Sample Rider 03', 'sample-session-3', '22:50, 22:20, 21:55', 0, 11),
    ('Sample Rider 04', 'sample-session-3', '20:40, 20:38, 20:30, 20:28', 0, 12),
    ('Sample Rider 05', 'sample-session-3', '23:50, 23:20, 22:58', 0, 13),
    ('Sample Rider 06', 'sample-session-3', '22:20, 21:50, 21:30, 21:12', 0, 14),
    ('Sample Rider 01', 'sample-session-4', '20:58, 20:22, 19:55, 19:32, 19:10', 2, 15),
    ('Sample Rider 02', 'sample-session-4', '21:50, 21:20, 20:58, 20:40', 2, 16),
    ('Sample Rider 03', 'sample-session-4', '22:30, 21:58, 21:30, 21:05', 2, 17),
    ('Sample Rider 04', 'sample-session-4', '20:36, 20:30, 20:26, 20:18, 20:02', 2, 18),
    ('Sample Rider 05', 'sample-session-4', '23:30, 22:55, 22:24', 2, 19),
    ('Sample Rider 06', 'sample-session-4', '22:05, 21:40, 21:38', 2, 20);

  -- Each of the six gets the 2 bonus points entered on their result above.
  insert into ridge_spotlights (session_slug, award_slug, athlete_name, metric, sort_order) values
    ('sample-session-4', 'session-leader', 'Sample Rider 01', '+8.87 progress points', 1),
    ('sample-session-4', 'endurance-standout', 'Sample Rider 04', '5 loops · 45.75 km', 2),
    ('sample-session-4', 'fastest-lap', 'Sample Rider 02', '20:40 on loop 4', 3),
    ('sample-session-4', 'biggest-improvement', 'Sample Rider 03', '+2.37 points on loop 2', 4),
    ('sample-session-4', 'strong-finish', 'Sample Rider 05', '+2.25 points on the final loop', 5),
    ('sample-session-4', 'most-consistent', 'Sample Rider 06', '27 seconds between loops', 6);
end $$;

-- Membership -----------------------------------------------------------------

insert into membership_plans (slug, name, kind, sessions, price, club_price, billing_label, validity_weeks, featured, sort_order)
select * from (values
  ('rtg-club', 'RTG CLUB', 'club', 0, 100, null::numeric, '/ month', 0, false, 1),
  ('ridge-1-session', 'Ridge Repeats — 1 session', 'ridge', 1, 250, 200, 'one-time', 0, false, 2),
  ('ridge-4-sessions', 'Ridge Repeats — 4 sessions', 'ridge', 4, 800, null, 'one-time', 6, true, 3),
  ('ridge-8-sessions', 'Ridge Repeats — 8 sessions', 'ridge', 8, 1400, null, 'one-time', 12, false, 4),
  ('ridge-12-sessions', 'Ridge Repeats — 12 sessions', 'ridge', 12, 2000, null, 'one-time', 18, false, 5),
  ('ridge-16-sessions', 'Ridge Repeats — 16 sessions', 'ridge', 16, 2600, null, 'one-time', 24, false, 6)
) as starter
where not exists (select 1 from membership_plans);

insert into membership_perks (icon, title, text, review_label, review_value, sort_order)
select * from (values
  ('↗', '20% off RTG paid events', 'Make room for your next experience.', 'Paid event discount', '20%', 1),
  ('◷', '24-hour early booking access', 'Book one day before the public launch.', 'Early booking', '24 hours', 2),
  ('＋', '20% off the RTG Store', 'Bring a little more RTG into your everyday.', 'RTG Store discount', '20%', 3)
) as starter
where not exists (select 1 from membership_perks);

insert into membership_guides (title, text, link_label, link_action, sort_order)
select * from (values
  ('Want the RTG perks?', 'Choose **RTG Club** for event and store discounts, plus early booking access—wherever you live in India.', 'Explore Club ↑', 'plans', 1),
  ('Coming to the Ridge?', 'Choose a **Ridge session pack** for prepaid sessions in Delhi NCR. No Club subscription is required.', 'Choose your pack ↑', 'plans', 2),
  ('Want both?', 'Hold **Club and a Ridge pack** together. Enjoy the Club perks; the already-discounted pack price stays the same.', 'See an example →', 'example', 3)
) as starter
where not exists (select 1 from membership_guides);

insert into membership_steps (title, text, sort_order)
select * from (values
  ('Choose your commitment', 'Start with a single session or choose a pack with more room to progress.', 1),
  ('Book your session', 'A pack gives you credits. Reserve a place in the session you want to attend.', 2),
  ('Watch your progress', 'Explore lap times, session progress, rider spotlights and photo cards in the Ridge lab.', 3)
) as starter
where not exists (select 1 from membership_steps);

insert into membership_faqs (question, answer, sort_order)
select * from (values
  ('Is RTG Club included in a Ridge pack?', 'No. They are separate offers. You can buy a Ridge pack without Club membership, or hold both together.', 1),
  ('Can I use the Club discount on a Ridge pack?', 'Pack prices are already discounted, so no additional Club discount applies. An active Club member can book a single Ridge session for ₹200 instead of ₹250.', 2),
  ('When does my pack validity begin?', 'From your first attended session: 6 weeks for 4 sessions, 12 weeks for 8, 18 weeks for 12, and 24 weeks for 16.', 3),
  ('What if RTG cancels a session?', 'No session credit will be deducted, and pack validity will be extended where needed.', 4),
  ('Does a pack guarantee a place every Saturday?', 'No. Booking is required and places are subject to availability. Your pack pays for session credits, not a reserved place on every date.', 5),
  ('What does the 24-hour early access mean?', 'Club members can book eligible RTG paid events one day before their public launch. Availability still applies.', 6)
) as starter
where not exists (select 1 from membership_faqs);

-- 6. The sample Ridge Repeats sessions of migration 011 get a date, so they
--    stay on the board. A session an admin added without a date is NOT
--    shown until its date is filled in (Admin -> Ridge Repeats — Sessions).

update ridge_sessions set session_date = current_date - 14 where slug = 'session-a' and name = 'Sample Session A' and session_date is null;
update ridge_sessions set session_date = current_date - 7 where slug = 'session-b' and name = 'Sample Session B' and session_date is null;

-- 7. Links that pointed at the old page ---------------------------------------

update footer_links set label = 'RTG Lab', link_url = '/lab' where link_url = '/leaderboard';

insert into footer_links (column_title, column_order, label, link_url, sort_order)
select f.column_title, f.column_order, 'Membership', '/membership', f.sort_order
from footer_links f
where f.link_url = '/lab'
  and not exists (select 1 from footer_links where link_url = '/membership')
limit 1;

update site_settings set value = '/lab' where key = 'text.home.join.boardLink' and value = '/leaderboard';

-- 8. Remove what the new pages replace. THIS DELETES DATA:
--    * the four Leaderboard tables and every row in them — the made-up
--      athletes of migration 011 and anything typed in since (the page they
--      fed no longer exists) ....................................... DROPPED
--    * the Leaderboard page's saved wording ("text.leaderboard.*") . DELETED
--    * the "Overall Progress" pseudo-session of Ridge Repeats and its
--      results — the overall board is now worked out from the real
--      sessions ..................................................... DELETED
--    * ridge_sessions.loop_count — the most loops is now one setting for
--      the page (Site Content -> Ridge Repeats) ..................... DROPPED
--    * ridge_results.score and ridge_results.improvement_pct — Ridge
--      points are now worked out from the loop times, plus the Spotlight
--      bonus and correction typed on the result ..................... DROPPED
--    The Strava totals (leaderboard_stats / strava_activities) are NOT
--    touched — members still see their own on their dashboard.

delete from ridge_sessions where slug = 'overall';
alter table ridge_sessions drop column if exists loop_count;
alter table ridge_results drop column if exists improvement_pct;
alter table ridge_results drop column if exists score;

drop table if exists leaderboard_entries;
drop table if exists leaderboard_challenges;
drop table if exists leaderboard_sports;
drop table if exists leaderboard_age_groups;

delete from site_settings where key like 'text.leaderboard.%';
