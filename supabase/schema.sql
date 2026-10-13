-- ============================================================================
-- RTG (Ride Tea GupShup) — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor
-- > New query > paste this whole file > Run). Safe to re-run: every
-- statement is guarded with IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- PART A — Member accounts (public signup/login, incl. Strava/XFitConnect)
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  city text,
  auth_provider text not null default 'email',  -- 'email' | 'strava' | 'xfitconnect'
  strava_athlete_id bigint unique,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  xfitconnect_athlete_id text unique,
  xfitconnect_access_token text,
  xfitconnect_refresh_token text,
  created_at timestamptz not null default now()
);

-- Added for the member Dashboard / Athlete Profile page.
alter table profiles add column if not exists sport text;
alter table profiles add column if not exists bio text;

-- Collected at signup. Contact info only, not a Supabase Auth identity:
-- logging in by phone works through /api/auth/phone-login, which looks up
-- the matching email and checks the password against that instead.
alter table profiles add column if not exists phone text;

-- Filled in on the one-time post-signup /onboarding page — mirrors RTG's
-- real paper/Google-Form registration questions (city, DOB, age, gender,
-- rider/runner, ride frequency, Strava, Instagram, emergency contact,
-- medical conditions, blood group, why join), plus avatar and — for
-- Google sign-ins, which don't come with a password — a phone + password
-- so they can log in by phone too afterward.
alter table profiles add column if not exists age int;
alter table profiles add column if not exists onboarding_complete boolean not null default false;
alter table profiles add column if not exists dob date;
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists rider_type text;        -- 'Rider' | 'Runner' | 'Both'
alter table profiles add column if not exists ride_frequency text;
alter table profiles add column if not exists has_strava boolean;
alter table profiles add column if not exists instagram_id text;
alter table profiles add column if not exists emergency_contact text;
alter table profiles add column if not exists medical_conditions text;
alter table profiles add column if not exists blood_group text;
alter table profiles add column if not exists join_reason text;

-- Kept in sync from auth.users.last_sign_in_at by the trigger below — lets
-- the admin Members screen show "last logged in" without needing access to
-- the auth schema directly (Supabase doesn't expose it over the API).
alter table profiles add column if not exists last_login_at timestamptz;

-- Community membership: set when the member submits the Community
-- Registration form (/onboarding). A "Join Community" button sends anyone
-- not yet joined to that form, and shows members a welcome-back window
-- instead (src/lib/JoinCommunityContext.jsx). See migration 014.
alter table profiles add column if not exists community_joined boolean not null default false;
alter table profiles add column if not exists community_joined_at timestamptz;
update profiles set community_joined = true, community_joined_at = coalesce(community_joined_at, created_at)
where onboarding_complete = true and community_joined = false;

alter table profiles enable row level security;

drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles
  for update using (auth.uid() = id);

-- No public insert policy on purpose: rows are created either by the
-- on_auth_user_created trigger below (email signups) or by the Node OAuth
-- backend using the service-role key (Strava/XFitConnect signups), which
-- bypasses RLS entirely.

-- Auto-create a profiles row whenever someone signs up with email/password
-- directly through Supabase Auth (so every member has exactly one row here,
-- regardless of how they signed up). Deliberately does NOT touch
-- admin_profiles directly — the actual admin grant happens in
-- api/auth/claim-bootstrap-admin.js instead (called right after sign-in
-- from AdminLogin.jsx / AuthCallback.jsx), which is what lets the first 3
-- people to ever authenticate through /admin/login become admins: doing
-- the count check server-side, against the real table, at the moment of
-- granting — rather than baked into this trigger — is what makes that
-- check race-safe under concurrent signups. See the bottom of this file.


create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, auth_provider)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'email')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Mirrors auth.users.last_sign_in_at into profiles.last_login_at every time
-- someone logs in (Supabase Auth updates that column on every sign-in),
-- purely so the admin Members screen can show it.
create or replace function sync_last_login()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles set last_login_at = new.last_sign_in_at where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update on auth.users
  for each row execute function sync_last_login();

-- ----------------------------------------------------------------------------
-- No email/SMS verification on signup by design — one manual check in the
-- Supabase dashboard, no SQL needed: Authentication > Providers > Email >
-- make sure "Confirm email" stays OFF. With it off, signUp() returns a
-- session immediately and the new-account flow finishes on /onboarding
-- (phone, password, age, photo) instead of waiting on a code. See
-- AuthGate.jsx, admin/pages/AdminLogin.jsx, pages/Onboarding.jsx.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- PART B — Admin-managed site content
-- ============================================================================

create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- A second FK on the same column, alongside the auth.users one above —
-- Postgres allows both since profiles.id is always a subset of
-- auth.users.id. This is what makes deleting someone's profiles row (from
-- the Supabase Table Editor, or anywhere) immediately revoke their admin
-- access too, not just deleting the underlying auth user.
alter table admin_profiles drop constraint if exists admin_profiles_profile_fk;
alter table admin_profiles
  add constraint admin_profiles_profile_fk foreign key (id) references profiles(id) on delete cascade;

alter table admin_profiles enable row level security;
drop policy if exists "admin_profiles self read" on admin_profiles;
create policy "admin_profiles self read" on admin_profiles
  for select using (auth.uid() = id);

-- Helper: is the current request from a known admin?
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.admin_profiles where id = auth.uid());
$$;

-- Any existing admin can see the full admin team, and promote/revoke other
-- members to admin — this is what powers the in-app "Admins" screen, so
-- granting admin access doesn't require a developer running SQL by hand
-- (except for the very first admin, which is an unavoidable one-time
-- bootstrap step — see the bottom of this file).
drop policy if exists "admin_profiles admin read all" on admin_profiles;
create policy "admin_profiles admin read all" on admin_profiles
  for select using (is_admin());

drop policy if exists "admin_profiles admin insert" on admin_profiles;
create policy "admin_profiles admin insert" on admin_profiles
  for insert with check (is_admin());

drop policy if exists "admin_profiles admin delete" on admin_profiles;
create policy "admin_profiles admin delete" on admin_profiles
  for delete using (is_admin());

-- Admins also need to browse/search all members (not just their own row) to
-- grant them admin access from the "Admins" screen.
drop policy if exists "profiles admin read all" on profiles;
create policy "profiles admin read all" on profiles
  for select using (is_admin());

-- Hard cap of 2 simultaneous admins, enforced here at the database level so
-- it applies no matter which path an insert comes through — the one-time
-- bootstrap endpoint (api/auth/claim-bootstrap-admin.js) is the only path
-- left that can grant admin (see the removed "Make Admin" button note at
-- the bottom of this file) — and can't be bypassed by calling the API
-- directly. Not "at signup" anymore: see handle_new_user() above, and the
-- bootstrapping note at the bottom of this file.
create or replace function enforce_admin_seat_cap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.admin_profiles) >= 2 then
    raise exception 'Admin seat cap of 2 reached — remove an existing admin first.';
  end if;
  return new;
end;
$$;

drop trigger if exists admin_seat_cap on admin_profiles;
create trigger admin_seat_cap
  before insert on admin_profiles
  for each row execute function enforce_admin_seat_cap();

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  event_date text not null,
  event_type text,
  categories text[] not null default '{}',
  prize_pool text,
  description text,
  cover_image_url text,
  featured boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added for per-event detail pages (/events/:slug).
alter table events add column if not exists route_info text;
alter table events add column if not exists elevation_gain text;
alter table events add column if not exists gpx_url text;
alter table events add column if not exists results_summary text;
alter table events add column if not exists previous_edition_summary text;

-- Route map (admin types a place/address, the public site embeds a Google Maps iframe for it).
alter table events add column if not exists route_map_query text;

-- The event's category on the Events page board (its filter pill).
-- Admin-picked. 'Past' also keeps an event out of Home's Upcoming Events.
-- Separate from `featured` above, which only controls the homepage slides.
-- (Was 'Flagship' / 'Upcoming' / 'Past' before migration 009.)
alter table events add column if not exists event_status text not null default 'Community';
alter table events drop constraint if exists events_status_check;
update events set event_status = 'Community' where event_status = 'Upcoming';
alter table events alter column event_status set default 'Community';
alter table events add constraint events_status_check check (event_status in ('Flagship', 'Community', 'Virtual', 'Past'));

-- Accent colours on the Events page: sunset | electric | trail | blue |
-- warm | mint | future. Optional.
alter table events add column if not exists tone text;

-- Prize Pool moved from free text (e.g. "Prize Pool Worth ₹5 Lakhs") to a plain
-- number so the public site can format it as currency consistently. Strips any
-- non-numeric characters (₹, commas, "Lakhs" text, stray spaces) before casting
-- so this is safe to re-run even if existing rows still hold the old free text.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'events' and column_name = 'prize_pool' and data_type <> 'numeric'
  ) then
    alter table events
      alter column prize_pool type numeric
      using nullif(regexp_replace(prize_pool, '[^0-9.]', '', 'g'), '')::numeric;
  end if;
end $$;

create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  caption text,
  category text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table gallery_items add column if not exists category text;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  image_url text,
  tag text,
  in_stock boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text,
  excerpt text,
  content text,
  cover_image_url text,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  tier text,
  website_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  quote text not null,
  avatar_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period text,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  city text,
  sport text,
  instagram_url text,
  avatar_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists race_results (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  athlete_name text not null,
  category text,
  finish_time text,
  position text,
  year text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Finisher certificate (a PDF/image an admin uploads per result row) shown
-- as a "Download Certificate" button on the public Race Results page.
alter table race_results add column if not exists certificate_url text;

create table if not exists site_images (
  key text primary key,
  url text not null,
  label text,
  updated_at timestamptz not null default now()
);

-- Small generic key/value table for one-off site settings that don't need
-- their own table (e.g. the downloadable sponsor deck link).
create table if not exists site_settings (
  key text primary key,
  value text,
  label text,
  updated_at timestamptz not null default now()
);

-- Real, admin-manageable weekly session schedule — replaces the old
-- hardcoded 3-day content.js list so the Weekly Rides page can show a full
-- schedule with pace groups, difficulty, and route maps per session.
create table if not exists weekly_sessions (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  name text not null,
  time text,
  location text,
  format text,
  difficulty text,
  pace_group text,
  route_map_query text,
  cost text,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Gives each weekly session its own page at /weekly-rides/<slug> (auto-filled
-- from the name in the admin form, same pattern as events.slug). Nullable
-- and unique rather than "not null" since it's being added after the table
-- already existed.
alter table weekly_sessions add column if not exists slug text unique;

-- Backfills a slug for any row that doesn't have one yet — safe to re-run,
-- only ever touches rows where slug is still null, and matches the same
-- lowercase-hyphenated format the admin form generates. Means an existing
-- session (like one created before this column existed) gets a working
-- detail page automatically, with no need to manually re-open and re-save
-- it in the admin.
update weekly_sessions
set slug = lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
where slug is null;

-- Home's "Training Formats" section used to borrow four extra columns on
-- this table; it now has its own table (home_training_formats, below), so
-- they're dropped. See supabase/migrations/004_remove_unused.sql.
alter table weekly_sessions drop column if exists image_url;
alter table weekly_sessions drop column if exists tags;
alter table weekly_sessions drop column if exists steps;
alter table weekly_sessions drop column if exists highlights;

-- ============================================================================
-- Content that used to be hardcoded in src/data/content.js with no admin
-- path at all — FAQ, safety checklists, sponsor pricing, size guide, and
-- merch reviews. Same shape/plain-public-content pattern as everything
-- above, so these join the generic RLS loop below rather than needing
-- bespoke policies (unlike orders, which are private per-user).
-- ============================================================================

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Friday Bricks–specific FAQ (Weekly Rides page) — kept separate from the
-- site-wide `faqs` above since they're edited and shown in different
-- places and shouldn't be mixed together in one admin list.
create table if not exists ride_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Plain checklist items — Weekly Rides' "Ride Safety" list and Safety
-- page's "Weekly Session Checklist" both read this same table.
create table if not exists ride_safety (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Also read by Weekly Rides and an event's "What to Bring" preview.
create table if not exists what_to_bring (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists general_safety (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Home page sections directly under the hero — one table per section, each
-- with its own admin screen. Their headings/paragraphs live in
-- site_settings ("text.home.why.*" / "text.home.ways.*"). Starter rows are
-- in supabase/migrations/002_home_sections.sql.
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

-- Site footer link columns (Admin -> Footer Links). Starter rows are in
-- supabase/migrations/008_footer_links.sql.
create table if not exists footer_links (
  id uuid primary key default gen_random_uuid(),
  column_title text not null,
  column_order int not null default 0,
  label text not null,
  link_url text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Home's dark, tabbed "Training Formats" band. Text conventions and starter
-- rows are in supabase/migrations/003_home_training_and_event_cards.sql.
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

-- Optional extras for an event's Home "Upcoming Events" slide.
alter table events add column if not exists home_title_accent text;
alter table events add column if not exists home_pills text;
alter table events add column if not exists highlight_label text;
alter table events add column if not exists highlight_title text;
alter table events add column if not exists highlight_text text;
alter table events add column if not exists secondary_button_label text;
alter table events add column if not exists secondary_button_link text;

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

create table if not exists sponsor_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price text,
  perks text[] not null default '{}',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sponsor_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- The old Store page's size chart and review cards had a table each; the
-- rebuilt page has neither section, so both are dropped. See
-- supabase/migrations/013_store.sql.
drop table if exists size_guide;
drop table if exists merch_reviews;

-- Event-specific photos/videos: lets "View Event Gallery" on an event's
-- detail page show only that event's media instead of the whole gallery.
-- A slug reference (not a uuid FK) so admins can type it directly in the
-- Gallery upload form.
alter table gallery_items add column if not exists event_slug text references events(slug) on delete set null;

-- ============================================================================
-- Calendar page (/calendar) — two tables of its own, each with an admin
-- screen. Its headings and labels live in site_settings under
-- "text.calendar.<field>" (Admin -> Site Content -> Calendar). Starter rows,
-- and the one-time copy of the old calendar into these tables, are in
-- supabase/migrations/010_calendar.sql.
-- ============================================================================

-- The activity types (Admin -> Calendar — Activity Types): each is a filter
-- pill, a legend pill, a hero tag and the colour of its activities.
create table if not exists calendar_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  detail_label text,
  color text not null default '#35246f',
  show_as_filter boolean not null default true,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Whether a type has its own filter pill above the calendar (a type can be
-- kept for its colour and legend only). See migration 015.
alter table calendar_categories add column if not exists show_as_filter boolean not null default true;
comment on column calendar_categories.show_as_filter is 'Whether this activity type has its own filter pill above the calendar.';

-- Everything on the calendar (Admin -> Calendar — Activities). A row is
-- 'weekly' (repeats on `weekday`), 'once' (happens on `activity_date`) or
-- 'flexible' (no fixed day — "Weekly Rhythm" panel only, shows `when_text`).
create table if not exists calendar_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_slug text references calendar_categories(slug) on update cascade on delete set null,
  also_category_slugs text[] not null default '{}',
  schedule_type text not null default 'weekly' check (schedule_type in ('weekly', 'once', 'flexible')),
  weekday text check (weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  activity_date date,
  when_text text,
  time_text text,
  city text,
  location text,
  format text,
  summary text,
  organiser text,
  status_label text,
  note text,
  link_label text,
  link_url text,
  show_in_rhythm boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- An activity sits under its own type's filter and under each of these too
-- (e.g. Brick & Burn under Cycling and Running). See migration 015.
alter table calendar_activities add column if not exists also_category_slugs text[] not null default '{}';
comment on column calendar_activities.also_category_slugs is 'Short codes of the other activity types whose filter this activity also appears under.';

create index if not exists calendar_activities_date_idx on calendar_activities (activity_date) where activity_date is not null;

-- These two tables replaced the old calendar_events table and the
-- events.calendar_date column. Migration 010 copies their rows across
-- before dropping them, so they're only dropped here once that copy has
-- happened (the new table has rows) — re-running this file on a database
-- that hasn't had migration 010 yet never loses calendar data.
do $$
begin
  if exists (select 1 from calendar_activities) then
    drop table if exists calendar_events;
    drop index if exists events_calendar_date_idx;
    alter table events drop column if exists calendar_date;
  end if;
end $$;

-- ============================================================================
-- RTG Lab (/lab, /lab/strava, /lab/ridge) and Membership (/membership). The
-- Lab replaced the Leaderboard page in migration 016. Every list on these
-- pages is a table with its own admin screen (Lab — … / Ridge Repeats — … /
-- Membership — …); their headings and labels live in site_settings under
-- "text.lab.<field>", "text.ridge.<field>" and "text.membership.<field>".
-- Starter rows are in supabase/migrations/016_lab_and_membership.sql.
-- (The Strava totals further down — leaderboard_stats — are a separate,
-- automatic thing shown on each member's own dashboard.)
-- ============================================================================

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

-- ============================================================================
-- Community page (/community) — seven tables of its own, each with an admin
-- screen. Its headings and labels live in site_settings under
-- "text.community.<field>" (Admin -> Site Content -> Community); its two
-- background photos are the 'communityHero' and 'communityWay' site photos.
-- Starter rows are in supabase/migrations/012_community.sql.
--   community_paths           "Find Your Place" carousel cards
--   community_principles      "The RTG Way" cards
--   community_milestones      "RTG in Motion" timeline cards
--   community_network_cities  pins on the India map (one is the RTG hub)
--   community_network_groups  the communities of "The RTG Network"
--   community_cities          city buttons of "One Community. Different Cities."
--   community_city_moments    the photos that rotate beside those buttons
-- ============================================================================

create table if not exists community_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  nav_label text,
  description text,
  image_url text,
  image_position text,
  link_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column community_paths.nav_label is 'Short word on the button under the carousel (e.g. Ride). Falls back to title.';
comment on column community_paths.image_position is 'Optional. Which part of the photo stays in view, as a CSS background-position (e.g. center 45%).';

create table if not exists community_principles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  label text,
  description text,
  nav_label text,
  ghost_word text,
  tags text,
  icon text not null default 'people',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column community_principles.nav_label is 'Short word on the button under the cards (e.g. Community). Falls back to title.';
comment on column community_principles.ghost_word is 'The big faint word behind the cards while this one is open (e.g. No Ego).';
comment on column community_principles.tags is 'Comma-separated pills at the bottom of the card.';
comment on column community_principles.icon is 'Key of a line-art icon drawn by pages/Community.jsx: people | target | chat | shield.';

create table if not exists community_milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  label text,
  description text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists community_network_cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  pin_x numeric not null default 50 check (pin_x between 0 and 100),
  pin_y numeric not null default 50 check (pin_y between 0 and 100),
  is_hub boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column community_network_cities.pin_x is 'Pin position across the India map, in % from its left edge.';
comment on column community_network_cities.pin_y is 'Pin position down the India map, in % from its top edge.';
comment on column community_network_cities.is_hub is 'The RTG hub: drawn in orange, not clickable; a route runs from it to every other pin.';

create table if not exists community_network_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monogram text,
  group_type text not null default 'connected' check (group_type in ('connected', 'wider')),
  city_slug text references community_network_cities(slug) on update cascade on delete set null,
  location text,
  sport text,
  tagline text,
  relation_label text,
  connection_label text,
  description text,
  contact_person text,
  reach text,
  join_text text,
  featured boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column community_network_groups.group_type is 'connected = the "Connected with RTG" tab; wider = the "Wider Community" tab.';
comment on column community_network_groups.tagline is 'Optional small line above the name (e.g. Delhi NCR • Cycling • Training). Falls back to location • sport.';

create index if not exists community_network_groups_type_idx on community_network_groups (group_type);

create table if not exists community_cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  context_line text,
  caption text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists community_city_moments (
  id uuid primary key default gen_random_uuid(),
  city_slug text references community_cities(slug) on update cascade on delete cascade,
  label text,
  image_url text,
  image_position text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column community_city_moments.image_position is 'Optional. Which part of the photo stays in view, as a CSS background-position (e.g. center 48%).';

create index if not exists community_city_moments_city_idx on community_city_moments (city_slug);

-- Same RLS pattern on every content table: public can read, only admins
-- (rows in admin_profiles) can write.
do $$
declare
  t text;
  has_published boolean;
begin
  foreach t in array array['events', 'gallery_items', 'products', 'blog_posts', 'sponsors', 'testimonials', 'challenges', 'site_images', 'team_members', 'race_results', 'calendar_categories', 'calendar_activities', 'lab_programmes', 'lab_periods', 'lab_highlights', 'lab_principles', 'lab_access_steps', 'lab_sports', 'lab_age_groups', 'lab_activities', 'ridge_sessions', 'ridge_results', 'ridge_awards', 'ridge_spotlights', 'membership_plans', 'membership_perks', 'membership_guides', 'membership_steps', 'membership_faqs', 'community_paths', 'community_principles', 'community_milestones', 'community_network_cities', 'community_network_groups', 'community_cities', 'community_city_moments', 'weekly_sessions', 'site_settings', 'faqs', 'ride_faqs', 'ride_safety', 'what_to_bring', 'general_safety', 'sponsor_tiers', 'sponsor_opportunities', 'home_why_reasons', 'home_ways', 'home_training_formats', 'footer_links']
  loop
    execute format('alter table %I enable row level security', t);

    select exists (
      select 1 from information_schema.columns
      where table_name = t and column_name = 'published'
    ) into has_published;

    execute format('drop policy if exists "%s public read" on %I', t, t);
    if has_published then
      execute format('create policy "%s public read" on %I for select using (published = true or is_admin())', t, t);
    else
      execute format('create policy "%s public read" on %I for select using (true)', t, t);
    end if;

    execute format('drop policy if exists "%s admin insert" on %I', t, t);
    execute format('create policy "%s admin insert" on %I for insert with check (is_admin())', t, t);

    execute format('drop policy if exists "%s admin update" on %I', t, t);
    execute format('create policy "%s admin update" on %I for update using (is_admin())', t, t);

    execute format('drop policy if exists "%s admin delete" on %I', t, t);
    execute format('create policy "%s admin delete" on %I for delete using (is_admin())', t, t);
  end loop;
end $$;

-- Replacing a Site Photo (SiteImagesAdmin's "Replace" button) doesn't
-- destroy the old Cloudinary file right away — the old URL lands here
-- instead, and a daily cron (api/cron/purge-media.js) deletes anything
-- that's sat for 2+ days, both from Cloudinary and this table. Deleting a
-- photo outright (the Delete button) skips this queue entirely and destroys
-- it immediately. No public/admin delete or update policy on purpose — only
-- the cron (service-role, bypasses RLS) ever removes a row.
create table if not exists media_pending_deletions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz not null default now()
);

alter table media_pending_deletions enable row level security;

drop policy if exists "media_pending_deletions admin insert" on media_pending_deletions;
create policy "media_pending_deletions admin insert" on media_pending_deletions for insert with check (is_admin());

drop policy if exists "media_pending_deletions admin select" on media_pending_deletions;
create policy "media_pending_deletions admin select" on media_pending_deletions for select using (is_admin());

-- ============================================================================
-- Storage — one public bucket for all uploaded photos/videos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('rtg-media', 'rtg-media', true)
on conflict (id) do nothing;

drop policy if exists "rtg-media public read" on storage.objects;
create policy "rtg-media public read" on storage.objects
  for select using (bucket_id = 'rtg-media');

-- Admins can write anywhere in the bucket; a regular logged-in member can
-- only write inside their own "avatars/<their-user-id>/" folder — mirrors
-- exactly what api/cloudinary/sign-avatar.js used to enforce server-side
-- (forcing the folder to the caller's own id), now enforced by Postgres
-- instead of a signing endpoint, since uploads go straight from the browser
-- to Supabase Storage with no server hop in between.
drop policy if exists "rtg-media admin write" on storage.objects;
drop policy if exists "rtg-media write" on storage.objects;
create policy "rtg-media write" on storage.objects
  for insert with check (
    bucket_id = 'rtg-media'
    and (is_admin() or (storage.foldername(name))[1:2] = array['avatars', auth.uid()::text])
  );

drop policy if exists "rtg-media admin update" on storage.objects;
drop policy if exists "rtg-media update" on storage.objects;
create policy "rtg-media update" on storage.objects
  for update using (
    bucket_id = 'rtg-media'
    and (is_admin() or (storage.foldername(name))[1:2] = array['avatars', auth.uid()::text])
  );

drop policy if exists "rtg-media admin delete" on storage.objects;
drop policy if exists "rtg-media delete" on storage.objects;
create policy "rtg-media delete" on storage.objects
  for delete using (
    bucket_id = 'rtg-media'
    and (is_admin() or (storage.foldername(name))[1:2] = array['avatars', auth.uid()::text])
  );

-- Real submissions from the /contact page's form — previously that form
-- only showed a fake "Message Sent!" confirmation and stored nothing.
-- Anyone (including logged-out visitors) can submit one; only admins can
-- read, mark as read, or delete them, via the admin Messages screen.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

drop policy if exists "contact_messages public insert" on contact_messages;
create policy "contact_messages public insert" on contact_messages
  for insert with check (true);

drop policy if exists "contact_messages admin read" on contact_messages;
create policy "contact_messages admin read" on contact_messages
  for select using (is_admin());

drop policy if exists "contact_messages admin update" on contact_messages;
create policy "contact_messages admin update" on contact_messages
  for update using (is_admin());

drop policy if exists "contact_messages admin delete" on contact_messages;
create policy "contact_messages admin delete" on contact_messages
  for delete using (is_admin());

-- Old, removed RPC — replaced by api/auth/claim-bootstrap-admin.js (same
-- idea — first 3 signups become admin — moved server-side so it's a real
-- HTTP endpoint that can be rate-limited/logged/audited later, instead of a
-- client-callable Postgres RPC).
drop function if exists claim_admin_if_seats_open();

-- ============================================================================
-- Bootstrapping your admins: fully automatic, no SQL needed. The first 2
-- people to ever authenticate through /admin/login — email/password or
-- Google, Log In tab or Sign Up tab, doesn't matter which — become admins.
-- No allowlist, no pre-approval: whoever gets there first, up to 2, is an
-- admin. api/auth/claim-bootstrap-admin.js does the actual grant, checking
-- admin_profiles' row count server-side at the moment of the attempt so
-- concurrent signups can't race past the cap; the admin_seat_cap trigger
-- above enforces the same "at most 2" rule independently at the database
-- level regardless of which code path an insert comes through.
--
-- Once 2 admins exist, there is no way for anyone (including an existing
-- admin) to manually grant a third — the Admins screen only shows who's
-- currently an admin and lets an admin revoke another's access, it can no
-- longer promote a member. If a seat opens back up later (an admin's
-- profiles row got deleted, or their access was revoked — which, via
-- admin_profiles_profile_fk above, also removes their admin_profiles row),
-- it refills the same automatic way: the next person to authenticate
-- through /admin/login claims the open seat, no re-bootstrapping by hand.
--
-- Caution: on a public production site, this means the first 2 people who
-- ever complete /admin/login — not necessarily the people you intend —
-- become the founding admins. Get your own 2 admins signed up first, or
-- promote a specific existing account by hand instead:
--   insert into admin_profiles (id, full_name)
--   select id, full_name from profiles where email = 'the-right-persons-email'
--   on conflict (id) do nothing;
-- ============================================================================

-- ============================================================================
-- PART — Merchandise Orders (cart/checkout, self-hosted UPI payment)
--
-- Deliberately kept out of the generic "content tables" RLS loop above —
-- those tables are public-read/admin-write, but an order is private: a
-- member should only ever see their OWN orders (never another member's),
-- and only an admin can change an order's status. That's a different shape
-- of policy, so it's written out by hand here instead of being folded into
-- the shared loop, to avoid ever accidentally exposing orders as
-- publicly readable.
--
-- Payment is self-hosted UPI (your own UPI ID + a QR/deep-link shown at
-- checkout, see site_settings keys "payment.upiId" / "payment.payeeName")
-- rather than a payment gateway — no transaction fees, no business KYC
-- needed to get started. The buyer pays manually and types in the UPI
-- transaction reference (UTR); every order starts 'pending_verification'
-- until an admin checks that reference against their own bank/UPI app and
-- marks it 'confirmed' or 'rejected' from Admin -> Orders.
-- ============================================================================

-- Apparel products (jersey/t-shirt/hoodie) can list selectable sizes here;
-- products without sizes (cap/socks/bottle/wheel bag) just leave this blank.
alter table products add column if not exists sizes text[];
-- Shown on the new product detail page (/merchandise/:id).
alter table products add column if not exists description text;
-- Small line above the name on Home's Merchandise Highlights cards.
alter table products add column if not exists eyebrow text;

-- Store page (/merchandise): the tabs above the product list, and the
-- product fields its sections read. Its headings and labels — and the bag
-- drawer's and checkout page's — live in site_settings under
-- "text.store.<field>" (Admin -> Site Content -> Store). Starter categories
-- are in supabase/migrations/013_store.sql.
create table if not exists store_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table store_categories enable row level security;
drop policy if exists "store_categories public read" on store_categories;
create policy "store_categories public read" on store_categories for select using (published = true or is_admin());
drop policy if exists "store_categories admin insert" on store_categories;
create policy "store_categories admin insert" on store_categories for insert with check (is_admin());
drop policy if exists "store_categories admin update" on store_categories;
create policy "store_categories admin update" on store_categories for update using (is_admin());
drop policy if exists "store_categories admin delete" on store_categories;
create policy "store_categories admin delete" on store_categories for delete using (is_admin());

-- A product's `tag` is its badge and its `eyebrow` its category line there.
alter table products add column if not exists category_slug text references store_categories(slug) on update cascade on delete set null;
alter table products add column if not exists use_text text;
alter table products add column if not exists drop_text text;
alter table products add column if not exists watermark text;
alter table products add column if not exists color text not null default '#12beff';
alter table products add column if not exists color_alt text not null default '#3d72ff';
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists in_kit boolean not null default false;
alter table products add column if not exists kit_label text;
alter table products add column if not exists limited boolean not null default false;

comment on column products.category_slug is 'The Store page tab this product sits under (store_categories.slug).';
comment on column products.watermark is 'Big faint word behind the product photo on the Store page (e.g. Jersey).';
comment on column products.color is 'Hex colour (#rrggbb): first accent colour of this product on the Store page.';
comment on column products.color_alt is 'Hex colour (#rrggbb): second accent colour — the gradient runs from color to color_alt.';
comment on column products.featured is 'Shown in the Store hero''s Featured Drop rotator. If no product is ticked, the first three are shown.';
comment on column products.in_kit is 'Offered as a piece of the Store page''s Build Your Kit section.';
comment on column products.kit_label is 'Short name in the Build Your Kit section (e.g. Jersey). Falls back to the product name.';
comment on column products.limited is 'The product the Store page''s Limited / Event Edition card previews (the first one ticked).';

create index if not exists products_category_idx on products (category_slug);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  city text not null,
  pincode text not null,
  subtotal numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'confirmed', 'rejected', 'shipped', 'delivered')),
  utr_reference text,
  admin_note text,
  created_at timestamptz not null default now()
);

-- Line items are snapshotted (product_name/price captured at order time) so
-- a later price change or product deletion never rewrites past order
-- history — product_id is kept only as a soft reference for convenience.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  price numeric(10, 2) not null,
  size text,
  quantity int not null check (quantity > 0)
);

alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "orders own insert" on orders;
create policy "orders own insert" on orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders own read" on orders;
create policy "orders own read" on orders
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists "orders admin update" on orders;
create policy "orders admin update" on orders
  for update using (is_admin());

drop policy if exists "orders admin delete" on orders;
create policy "orders admin delete" on orders
  for delete using (is_admin());

drop policy if exists "order_items owner insert" on order_items;
create policy "order_items owner insert" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "order_items owner read" on order_items;
create policy "order_items owner read" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin()))
  );

drop policy if exists "order_items admin delete" on order_items;
create policy "order_items admin delete" on order_items
  for delete using (is_admin());
-- ============================================================================

-- ============================================================================
-- PART — Strava activity data (member profile stats + automatic totals)
--
-- Split into two tables on purpose:
--  - strava_activities holds the real, detailed data — kept private to the
--    owning member (and admins), same as an order or a profile field.
--  - leaderboard_stats holds only a running TOTAL per member — no dates, no
--    routes, no individual activities — and is the only one that's public.
-- The leaderboard is built to read from the safe, aggregated table only, so
-- there's never a path where a public page can query raw Strava activity
-- rows directly.
-- ============================================================================

create table if not exists strava_activities (
  id uuid primary key default gen_random_uuid(),
  strava_activity_id bigint unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  name text,
  distance_meters numeric,
  moving_time_seconds int,
  elevation_gain_meters numeric,
  average_speed numeric,
  start_date timestamptz,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strava_activities_user_id_idx on strava_activities (user_id);

-- One row per member, kept in sync by api-lib/stravaSync.js every time an
-- activity is added/updated/removed — recomputed from strava_activities for
-- that member, never edited directly. full_name/avatar_url are a snapshot
-- copied in at the same time (server-side, bypassing RLS) specifically so
-- the public leaderboard never needs a public-read policy on `profiles`
-- itself — this table is the only thing a visitor's browser ever queries.
create table if not exists leaderboard_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  total_distance_meters numeric not null default 0,
  total_moving_time_seconds int not null default 0,
  activity_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table strava_activities enable row level security;
alter table leaderboard_stats enable row level security;

drop policy if exists "strava_activities own read" on strava_activities;
create policy "strava_activities own read" on strava_activities
  for select using (auth.uid() = user_id or is_admin());

-- No public/member insert-update-delete policy on purpose — only the
-- service-role client (api-lib/stravaSync.js, bypasses RLS) ever writes
-- here, never a browser-supplied write.

drop policy if exists "leaderboard_stats public read" on leaderboard_stats;
create policy "leaderboard_stats public read" on leaderboard_stats
  for select using (true);
-- ============================================================================

-- ============================================================================
-- PART — RTG Lab registrations, Membership purchases and the Strava
-- Challenge board (migration 016). These come last because the board reads
-- strava_activities, defined just above.
-- ============================================================================

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
-- ============================================================================

-- ============================================================================
-- PART — Visitor statistics (Admin -> Visitors, migration 017)
--
-- One row per visit to the public site and one per page opened, written only
-- through track_site_visit() (called by src/lib/useVisitTracker.js) and read
-- only by admins, through site_traffic(). Stored about a visitor: a random
-- id their browser makes up, the pages they opened, when, and — if logged
-- in — which member. No IP address, location or device details.
-- ============================================================================

create table if not exists site_sessions (
  id uuid primary key,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_views int not null default 1,
  entry_path text,
  last_path text
);

comment on column site_sessions.visitor_id is 'Random id kept in the visitor''s browser — the same person on the same browser across visits. Not tied to an account.';
comment on column site_sessions.user_id is 'The member, if they were logged in at any point during the visit.';

create index if not exists site_sessions_started_idx on site_sessions (started_at);
create index if not exists site_sessions_last_seen_idx on site_sessions (last_seen_at);

create table if not exists site_page_views (
  id bigint generated always as identity primary key,
  session_id uuid not null references site_sessions(id) on delete cascade,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists site_page_views_viewed_idx on site_page_views (viewed_at);

-- Only admins can read these tables, and nobody writes to them directly:
-- every write goes through track_site_visit() below.
alter table site_sessions enable row level security;
alter table site_page_views enable row level security;

drop policy if exists "site_sessions admin read" on site_sessions;
create policy "site_sessions admin read" on site_sessions for select using (is_admin());

drop policy if exists "site_page_views admin read" on site_page_views;
create policy "site_page_views admin read" on site_page_views for select using (is_admin());

-- Called by the public site (src/lib/useVisitTracker.js): once when a page
-- opens (p_new_page = true) and every 30 seconds while the tab stays open
-- (p_new_page = false). The member is taken from the login itself, never
-- from what the browser sends.
create or replace function track_site_visit(p_session uuid, p_visitor uuid, p_path text, p_new_page boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_path text := left(coalesce(p_path, '/'), 200);
  v_views int;
begin
  if p_session is null or p_visitor is null then
    return;
  end if;

  insert into site_sessions (id, visitor_id, user_id, entry_path, last_path)
  values (p_session, p_visitor, auth.uid(), v_path, v_path)
  on conflict (id) do update
    set last_seen_at = now(),
        user_id = coalesce(auth.uid(), site_sessions.user_id),
        last_path = v_path,
        page_views = site_sessions.page_views + (case when p_new_page then 1 else 0 end)
  returning page_views into v_views;

  -- One visit never records more than 500 pages.
  if p_new_page and v_views <= 500 then
    insert into site_page_views (session_id, path) values (p_session, v_path);
  end if;
end;
$$;

revoke all on function track_site_visit(uuid, uuid, text, boolean) from public;
grant execute on function track_site_visit(uuid, uuid, text, boolean) to anon, authenticated;

-- The totals behind Admin -> Visitors, for the last p_days days (India
-- time). Admins only.
create or replace function site_traffic(p_days int default 30)
returns json
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_from date := v_today - (v_days - 1);
  v_result json;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;

  with visits as (
    select
      s.visitor_id,
      s.user_id,
      (s.started_at at time zone 'Asia/Kolkata')::date as day,
      case
        when s.user_id is not null then 'member'
        when s.page_views <= 1 and s.last_seen_at - s.started_at < interval '30 seconds' then 'left'
        else 'browsed'
      end as kind
    from site_sessions s
    where (s.started_at at time zone 'Asia/Kolkata')::date >= v_from
  ),
  days as (
    select d::date as day from generate_series(v_from, v_today, interval '1 day') as d
  ),
  per_day as (
    select
      d.day,
      count(v.*) filter (where v.kind = 'left') as left_quickly,
      count(v.*) filter (where v.kind = 'browsed') as browsed,
      count(v.*) filter (where v.kind = 'member') as members,
      count(distinct v.visitor_id) as people
    from days d
    left join visits v on v.day = d.day
    group by d.day
  ),
  pages as (
    select p.path, count(*) as views
    from site_page_views p
    where (p.viewed_at at time zone 'Asia/Kolkata')::date >= v_from
    group by p.path
    order by count(*) desc, p.path
    limit 8
  )
  select json_build_object(
    'days', (select coalesce(json_agg(json_build_object('day', day, 'left', left_quickly, 'browsed', browsed, 'members', members, 'people', people) order by day), '[]'::json) from per_day),
    'pages', (select coalesce(json_agg(json_build_object('path', path, 'views', views) order by views desc, path), '[]'::json) from pages),
    'people', (select count(distinct visitor_id) from visits),
    'members', (select count(distinct user_id) from visits where user_id is not null),
    'online', (select count(*) from site_sessions where last_seen_at > now() - interval '2 minutes'),
    'online_members', (select count(*) from site_sessions where last_seen_at > now() - interval '2 minutes' and user_id is not null)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function site_traffic(int) from public;
grant execute on function site_traffic(int) to authenticated;
-- ============================================================================
