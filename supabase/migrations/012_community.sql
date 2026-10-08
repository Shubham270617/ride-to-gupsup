-- ============================================================================
-- Migration 012 — Community page: its own seven tables
-- ============================================================================
-- Run AFTER 011, in the Supabase SQL Editor. Safe to re-run.
--
-- The Community page (/community) is now drawn entirely from seven new
-- tables, each with its own admin screen:
--
-- 1. community_paths — the "Find Your Place" photo cards (Ride, Run …).
--    Each one is a card of the 3D carousel and a button under it.
--    Admin -> Community — Find Your Place.
--
-- 2. community_principles — "The RTG Way" cards: label, heading, paragraph,
--    tags, line-art icon and the big faint word behind the cards.
--    Admin -> Community — The RTG Way.
--
-- 3. community_milestones — the "RTG in Motion" timeline cards.
--    Admin -> Community — RTG in Motion.
--
-- 4. community_network_cities — the pins on the India map of "The RTG
--    Network" (one of them is the RTG hub the routes start from).
--    Admin -> Community — Network Map Pins.
--
-- 5. community_network_groups — the communities of "The RTG Network", each
--    filed under "Connected with RTG" or "Wider Community" and under a map
--    pin. Admin -> Community — Network Groups.
--
-- 6. community_cities — the city buttons of "One Community. Different
--    Cities." with the line and caption shown for each.
--    Admin -> Community — Cities.
--
-- 7. community_city_moments — the photos that rotate through the three
--    frames beside those buttons, filed under a city.
--    Admin -> Community — City Photos.
--
-- The page's headings, labels and paragraphs live in site_settings under
-- "text.community.<field>" (Admin -> Site Content -> Community). Its two
-- background photos are Site Photos: "Community Hero" and "Community Way".
--
-- What this REPLACES — and removes:
--   * the old Community sections' saved headings (What RTG Feels Like, Way
--     to Be Part of RTG, Upcoming Community Experiences, Member Voices,
--     Volunteer With RTG) ............................................ DELETED
--   * nine Community site photos the new page no longer shows ....... DELETED
-- ============================================================================

-- 1. Tables ------------------------------------------------------------------

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

-- 2. Row level security — public can read published rows, admins write.

do $$
declare
  t text;
begin
  foreach t in array array['community_paths', 'community_principles', 'community_milestones', 'community_network_cities', 'community_network_groups', 'community_cities', 'community_city_moments']
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

-- 3. Starter "Find Your Place" cards — ONLY if there are none yet. The
--    photos are the site's own reference photos; replace them in
--    Admin -> Community — Find Your Place.

insert into community_paths (title, nav_label, description, image_url, image_position, link_url, sort_order)
select * from (values
  ('Ride.', 'Ride', 'Road rides, MTB, endurance sessions and miles shared with the group.',
   '/images/rtg-reference/rtg-cycling.jpg', 'center 50%', '#rtg-way', 1),
  ('Run.', 'Run', 'Road runs, trail mornings, bricks and sessions built around consistency.',
   '/images/rtg-reference/rtg-running.jpg', 'center 46%', '#rtg-way', 2),
  ('Explore.', 'Explore', 'Trails, long rides, MTB escapes and outdoor experiences beyond the usual route.',
   '/images/rtg-reference/rtg-adventure.jpg', 'center 54%', '#rtg-way', 3),
  ('Connect.', 'Connect', 'Chai stops, meetups, volunteering and the people who turn activities into memories.',
   '/images/rtg-reference/rtg-community.jpg', 'center 47%', '#cities', 4)
) as starter
where not exists (select 1 from community_paths);

-- 4. Starter "The RTG Way" cards — ONLY if there are none yet.

insert into community_principles (title, label, description, nav_label, ghost_word, tags, icon, sort_order)
select * from (values
  ('Shared Wins Matter More.', 'Community Over Competition',
   'Progress matters more than proving a point. We celebrate effort, participation and each other''s wins — without ego becoming the centre of the experience.',
   'Community', 'No Ego', 'No Ego, Encourage Others, Celebrate Progress', 'people', 1),
  ('Keep Showing Up.', 'Consistency Over Intensity',
   'You do not have to be the fastest or strongest person in the room. Build your rhythm, return consistently and improve at a pace that is genuinely yours.',
   'Consistency', 'Show Up', 'Build Rhythm, Keep Learning, Your Pace Counts', 'target', 2),
  ('The Activity Starts It.', 'Conversations Over Comparisons',
   'The ride or run may bring us together. The chai, stories, questions, laughter and friendships are what turn a sporting session into a community.',
   'Conversations', 'Listen', 'Listen, Share, Stay for the People', 'chat', 3),
  ('Every Person Deserves a Place.', 'Respect • Inclusivity • Support',
   'Different cities. Different abilities. Different goals. The standard stays the same: respect people, support people and make room for others to belong.',
   'Respect', 'Support', 'Every City, Every Pace, Real Support', 'shield', 4)
) as starter
where not exists (select 1 from community_principles);

-- 5. Starter "RTG in Motion" cards — ONLY if there are none yet.

insert into community_milestones (title, label, description, sort_order)
select * from (values
  ('Come Ride. Have Chai.', 'The Beginning',
   'The simple rhythm that brought people together — move first, then stay back for the conversations.', 1),
  ('Beyond Cycling.', 'Expanding the Mix',
   'Running, trails, bricks and different formats created more ways for people to participate and belong.', 2),
  ('More Structure. More Play.', 'Building Challenge',
   'Challenges, points, teams and competitive formats added fresh motivation while keeping the community spirit intact.', 3),
  ('A Stronger RTG.', 'What''s Next',
   'Better digital tools, stronger events and more city connections are helping the next chapter take shape.', 4)
) as starter
where not exists (select 1 from community_milestones);

-- 6. Starter map pins — ONLY if there are none yet.

insert into community_network_cities (slug, name, pin_x, pin_y, is_hub, sort_order)
select * from (values
  ('rtg-hub', 'RTG Hub', 34.2, 25.5, true, 1),
  ('delhi', 'Delhi', 35.2, 25.0, false, 2),
  ('noida', 'Noida', 36.8, 26.0, false, 3),
  ('chandigarh', 'Chandigarh', 33.6, 20.4, false, 4)
) as starter
where not exists (select 1 from community_network_cities);

-- 7. SAMPLE network groups — ONLY if there are none yet, so the section
--    isn't blank on day one. They come from the design reference: check
--    every name, description and contact (several contacts are left empty
--    on purpose) in Admin -> Community — Network Groups before the page
--    goes public, and delete any group that should not be listed.

insert into community_network_groups
  (name, monogram, group_type, city_slug, location, sport, tagline, relation_label, connection_label,
   description, contact_person, reach, join_text, featured, sort_order)
select
  s.name, s.monogram, s.group_type,
  (select c.slug from community_network_cities c where c.slug = s.city_slug),
  s.location, s.sport, s.tagline, s.relation_label, s.connection_label,
  s.description, s.contact_person, s.reach, s.join_text, s.featured, s.sort_order
from (values
  ('iRide2Reach', 'IR2R', 'connected', 'delhi', 'Delhi NCR', 'Cycling', 'Delhi NCR • Cycling • Training',
   'Featured Connection', 'Close RTG Connection',
   'A close RTG connection built around riding, training and the belief that progress grows when people move together.',
   'Manish Jayal', 'Instagram • @iride2reach', 'Message admin • Join a training ride', true, 1),
  ('Helipad Canal Riders', 'HCR', 'connected', 'delhi', 'Delhi NCR', 'Cycling', null,
   'Connected with RTG', 'Community Connection',
   'A Delhi cycling community linked through shared riding culture, endurance and the wider NCR cycling ecosystem.',
   null, null, null, false, 2),
  ('Noida Riding Club', 'NRC', 'connected', 'noida', 'Noida', 'Cycling', null,
   'Connected with RTG', 'Community Connection',
   'A Noida-based riding connection that extends the RTG network across the wider Delhi NCR cycling community.',
   null, null, null, false, 3),
  ('Chandigarh Distance Runners', 'CDR', 'connected', 'chandigarh', 'Chandigarh', 'Running', null,
   'Connected with RTG', 'Running Community',
   'A Chandigarh running connection bringing endurance, distance-running culture and a different sporting perspective into the wider network.',
   null, null, null, false, 4),
  ('Delhi Runners Group', 'DRG', 'wider', 'delhi', 'Delhi', 'Running', null,
   'Wider Community', 'Public Community',
   'A publicly active Delhi running community shown here as part of the wider endurance landscape, not as an RTG affiliation.',
   'Community Desk', 'Public Instagram / website', 'Check the next open run', false, 5),
  ('Noida Cycling Club', 'NCC', 'wider', 'noida', 'Noida', 'Cycling', null,
   'Wider Community', 'Public Community',
   'A long-running Noida cycling community included as part of the wider regional cycling ecosystem.',
   'Ride Coordinator', 'Public ride group / DM', 'Open community ride', false, 6),
  ('Cyclegiri', 'CYC', 'wider', 'chandigarh', 'Chandigarh Tricity', 'Cycling', null,
   'Wider Community', 'Public Community',
   'A Chandigarh Tricity cycling community focused on cycling culture and a more cycle-friendly region.',
   'City Lead', 'Instagram / cycling page', 'Community ride calendar', false, 7),
  ('Chandigarh Panthers', 'CP', 'wider', 'chandigarh', 'Chandigarh', 'Cycling', null,
   'Wider Community', 'Public Community',
   'A Chandigarh cycling club included to show the broader mix of groups active in the region.',
   'Club Admin', 'Public contact channel', 'Weekend ride introduction', false, 8)
) as s (name, monogram, group_type, city_slug, location, sport, tagline, relation_label, connection_label,
        description, contact_person, reach, join_text, featured, sort_order)
where not exists (select 1 from community_network_groups);

-- 8. Starter cities, and PLACEHOLDER city photos — ONLY if there are none
--    yet. Every city is given the site's own five reference photos for now:
--    replace them with that city's real photos in
--    Admin -> Community — City Photos.

insert into community_cities (slug, name, context_line, caption, sort_order)
select * from (values
  ('delhi', 'Delhi NCR', 'Delhi NCR • Rides • Runs • Community', 'A glimpse of RTG life in Delhi NCR.', 1),
  ('dehradun', 'Dehradun', 'Dehradun • Trails • Runs • Outdoors', 'Trail energy, open roads and community moments from the hills.', 2),
  ('chandigarh', 'Chandigarh', 'Chandigarh • Rides • Community • Endurance', 'Ride culture, shared miles and the Chandigarh RTG vibe.', 3),
  ('jaipur', 'Jaipur', 'Jaipur • Roads • Exploration • Community', 'A different landscape, the same RTG energy.', 4),
  ('network', 'Growing Network', 'More Cities • More People • One RTG', 'The next RTG city story is still being written.', 5)
) as starter
where not exists (select 1 from community_cities);

insert into community_city_moments (city_slug, label, image_url, image_position, sort_order)
select c.slug, s.label, '/images/rtg-reference/rtg-' || s.photo || '.jpg', s.image_position, s.sort_order
from (values
  ('delhi', 'Together', 'community', 'center 48%', 1),
  ('delhi', 'Ride', 'cycling', 'center 49%', 2),
  ('delhi', 'Run', 'running', 'center 43%', 3),
  ('delhi', 'People', 'community', 'center 43%', 4),
  ('delhi', 'Miles', 'cycling', 'center 55%', 5),
  ('delhi', 'Move', 'running', 'center 50%', 6),
  ('dehradun', 'Trails', 'adventure', 'center 52%', 1),
  ('dehradun', 'Run', 'running', 'center 43%', 2),
  ('dehradun', 'Escape', 'adventure2', 'center 48%', 3),
  ('dehradun', 'Ride', 'cycling', 'center 51%', 4),
  ('dehradun', 'Hills', 'adventure', 'center 44%', 5),
  ('dehradun', 'Together', 'community', 'center 48%', 6),
  ('chandigarh', 'Ride', 'cycling', 'center 50%', 1),
  ('chandigarh', 'Together', 'community', 'center 48%', 2),
  ('chandigarh', 'Move', 'running', 'center 43%', 3),
  ('chandigarh', 'Endure', 'cycling', 'center 57%', 4),
  ('chandigarh', 'People', 'community', 'center 44%', 5),
  ('chandigarh', 'Run', 'running', 'center 50%', 6),
  ('jaipur', 'Explore', 'adventure2', 'center 50%', 1),
  ('jaipur', 'Ride', 'cycling', 'center 49%', 2),
  ('jaipur', 'People', 'community', 'center 48%', 3),
  ('jaipur', 'Routes', 'adventure', 'center 52%', 4),
  ('jaipur', 'Move', 'running', 'center 44%', 5),
  ('jaipur', 'Miles', 'cycling', 'center 56%', 6),
  ('network', 'Connect', 'community', 'center 48%', 1),
  ('network', 'Explore', 'adventure', 'center 52%', 2),
  ('network', 'Grow', 'cycling', 'center 48%', 3),
  ('network', 'Move', 'running', 'center 44%', 4),
  ('network', 'Go', 'adventure2', 'center 50%', 5),
  ('network', 'RTG', 'community', 'center 43%', 6)
) as s (city_slug, label, photo, image_position, sort_order)
join community_cities c on c.slug = s.city_slug
where not exists (select 1 from community_city_moments);

-- 9. Remove what the new page replaces. THIS DELETES DATA: the saved
--    headings of the five old Community sections, and nine Community site
--    photos the page no longer shows. Any photo that had been uploaded for
--    them is queued for the daily clean-up first, so its file doesn't stay
--    behind in storage.

delete from site_settings
where key like 'text.community.feelsLike.%'
   or key like 'text.community.howToJoin.%'
   or key like 'text.community.upcoming.%'
   or key like 'text.community.voices.%'
   or key like 'text.community.volunteer.%';

insert into media_pending_deletions (url)
select url from site_images
where key in ('communityCyclists', 'communityRunners', 'communitySwimmers', 'communityTriathletes', 'communityBeginners',
              'communityExperienced', 'communityVolunteers', 'communityChai', 'communityCelebration');

delete from site_images
where key in ('communityCyclists', 'communityRunners', 'communitySwimmers', 'communityTriathletes', 'communityBeginners',
              'communityExperienced', 'communityVolunteers', 'communityChai', 'communityCelebration');
