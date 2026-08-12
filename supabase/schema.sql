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
-- regardless of how they signed up). The very FIRST person to ever sign up
-- (via the public site or the admin Sign Up tab, doesn't matter which) is
-- also auto-promoted to admin — no manual SQL bootstrap step needed.
-- Everyone after that stays a regular member until an existing admin
-- grants them access from the Admins screen.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, auth_provider)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'email')
  on conflict (id) do nothing;

  if not exists (select 1 from public.admin_profiles) then
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

-- ============================================================================
-- PART B — Admin-managed site content
-- ============================================================================

create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

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

create table if not exists site_images (
  key text primary key,
  url text not null,
  label text,
  updated_at timestamptz not null default now()
);

-- Same RLS pattern on every content table: public can read, only admins
-- (rows in admin_profiles) can write.
do $$
declare
  t text;
  has_published boolean;
begin
  foreach t in array array['events', 'gallery_items', 'products', 'blog_posts', 'sponsors', 'testimonials', 'challenges', 'site_images', 'team_members', 'race_results']
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

-- ============================================================================
-- Bootstrapping your FIRST admin: fully automatic, no SQL needed. The very
-- first person to ever sign up (via /admin/login's Sign Up tab, or the
-- public site) is auto-promoted to admin by the handle_new_user() trigger
-- above. Every admin after that one is added from the app's Admins screen.
--
-- Caution before this site goes live publicly: whoever signs up FIRST on
-- the production database becomes the founding admin. Make sure that's you
-- — sign up on production before sharing the link — or run this once
-- afterward to promote a specific existing account instead:
--   insert into admin_profiles (id, full_name)
--   select id, full_name from profiles where email = 'the-right-persons-email'
--   on conflict (id) do nothing;
-- ============================================================================
