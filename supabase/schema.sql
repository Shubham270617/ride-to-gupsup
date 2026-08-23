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
-- regardless of how they signed up). The first MAX_AUTO_ADMINS people to
-- ever sign up (via the public site or the admin Sign Up tab, doesn't
-- matter which) are also auto-promoted to admin — e.g. the 3 people
-- actually running RTG can each just sign up and log in, no manual SQL or
-- "ask an existing admin to grant you access" step needed. Everyone after
-- that stays a regular member until an existing admin grants them access
-- from the Members screen. To change the number of auto-admin seats, edit
-- the "< 3" here AND in claim_admin_if_seats_open() below — keep them equal.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, auth_provider)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'email')
  on conflict (id) do nothing;

  if (select count(*) from public.admin_profiles) < 3 then
    insert into public.admin_profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name')
    on conflict (id) do nothing;
  end if;

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

-- Covers two cases with the same "< 3" rule as handle_new_user() above:
-- (1) one of the 3 auto-admin seats is still open (e.g. this person signed
-- up back when fewer admins existed, or before this feature existed), and
-- (2) the seat count dropped below 3 later (an admin's profiles row got
-- deleted, which — via the cascade above — took their admin_profiles row
-- with it). Called from the client on every /admin/login attempt that
-- isn't already an admin (see AdminLogin.jsx, AuthCallback.jsx);
-- SECURITY DEFINER is what lets a non-admin caller insert into
-- admin_profiles at all, but the count check keeps this from ever being
-- usable to self-promote once 3 real admins already exist.
create or replace function claim_admin_if_seats_open()
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.admin_profiles) < 3 then
    insert into public.admin_profiles (id, full_name)
    select id, full_name from public.profiles where id = auth.uid()
    on conflict (id) do nothing;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function claim_admin_if_seats_open() to authenticated;

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

-- Real, admin-manageable calendar of races/rides — replaces the old
-- hardcoded content.js list so "Register" can deep-link to a real event
-- when one exists, and so a real `date` column (not free text like the
-- `events` table's event_date) can drive genuine "is this today" checks
-- for the login popup's Live Events section.
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  category text,
  city text,
  difficulty text,
  event_slug text references events(slug) on delete set null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
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

-- Event-specific photos/videos: lets "View Event Gallery" on an event's
-- detail page show only that event's media instead of the whole gallery.
-- A slug reference (not a uuid FK) so admins can type it directly in the
-- Gallery upload form, same pattern as calendar_events.event_slug above.
alter table gallery_items add column if not exists event_slug text references events(slug) on delete set null;

-- Same RLS pattern on every content table: public can read, only admins
-- (rows in admin_profiles) can write.
do $$
declare
  t text;
  has_published boolean;
begin
  foreach t in array array['events', 'gallery_items', 'products', 'blog_posts', 'sponsors', 'testimonials', 'challenges', 'site_images', 'team_members', 'race_results', 'calendar_events', 'weekly_sessions', 'site_settings']
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

drop policy if exists "rtg-media admin write" on storage.objects;
create policy "rtg-media admin write" on storage.objects
  for insert with check (bucket_id = 'rtg-media' and is_admin());

drop policy if exists "rtg-media admin update" on storage.objects;
create policy "rtg-media admin update" on storage.objects
  for update using (bucket_id = 'rtg-media' and is_admin());

drop policy if exists "rtg-media admin delete" on storage.objects;
create policy "rtg-media admin delete" on storage.objects
  for delete using (bucket_id = 'rtg-media' and is_admin());

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

-- ============================================================================
-- Bootstrapping your first admins: fully automatic, no SQL needed. The
-- first 3 people to ever sign up (via /admin/login's Sign Up tab, or the
-- public site — via /admin/login's Log In tab too, for existing members,
-- through claim_admin_if_seats_open()) are auto-promoted to admin. Once 3
-- exist, everyone after that stays a regular member until an existing
-- admin grants them access from the Members screen.
--
-- If a seat opens back up later (an admin's profiles row got deleted —
-- which, via admin_profiles_profile_fk above, also removes their
-- admin_profiles row), it refills the same automatic way: the next 1-3
-- people to log in claim the open seat(s), no re-bootstrapping by hand.
--
-- Caution before this site goes live publicly: the first 3 people who sign
-- up on the production database become the founding admins. Make sure
-- that's the right 3 people — or run this to promote a specific existing
-- account instead (works any time, whether or not the 3 seats are full):
--   insert into admin_profiles (id, full_name)
--   select id, full_name from profiles where email = 'the-right-persons-email'
--   on conflict (id) do nothing;
-- ============================================================================
