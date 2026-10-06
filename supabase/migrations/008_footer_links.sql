-- ============================================================================
-- Migration 008 — Footer link columns
-- ============================================================================
-- Run AFTER 007, in the Supabase SQL Editor. Safe to re-run.
--
-- footer_links — every link in the site footer's columns ("Community",
-- "Get Involved", "More", "Legal"), which used to be written in code.
-- Managed in Admin -> Footer Links. One row per link:
--   column_title  — the orange heading the link sits under. Links sharing
--                   the same title form one column.
--   column_order  — position of that column, left to right (use the same
--                   number on every link of a column).
--   label         — the link text.
--   link_url      — a page on this site ("/events") or a full address
--                   ("https://…").
--   sort_order    — position of the link inside its column, top to bottom.
--
-- The rest of the footer and the "Join the Movement" band above it are
-- single values, so they live in site_settings (Admin -> Site Content ->
-- Footer): text.footer.* and text.join.*.
-- ============================================================================

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

do $$
begin
  alter table footer_links enable row level security;

  drop policy if exists "footer_links public read" on footer_links;
  create policy "footer_links public read" on footer_links for select using (published = true or is_admin());

  drop policy if exists "footer_links admin insert" on footer_links;
  create policy "footer_links admin insert" on footer_links for insert with check (is_admin());

  drop policy if exists "footer_links admin update" on footer_links;
  create policy "footer_links admin update" on footer_links for update using (is_admin());

  drop policy if exists "footer_links admin delete" on footer_links;
  create policy "footer_links admin delete" on footer_links for delete using (is_admin());
end $$;

-- Starter rows — the footer exactly as it stands today.
insert into footer_links (column_title, column_order, label, link_url, sort_order)
select * from (values
  ('Community',    1, 'About RTG',              '/about',                1),
  ('Community',    1, 'Our Community',          '/community',            2),
  ('Community',    1, 'Weekly Rides',           '/weekly-rides',         3),
  ('Community',    1, 'Gallery',                '/gallery',              4),
  ('Community',    1, 'Volunteer',              '/community',            5),
  ('Get Involved', 2, 'Events',                 '/events',               1),
  ('Get Involved', 2, 'Challenges',             '/challenges',           2),
  ('Get Involved', 2, 'Race Calendar',          '/race-calendar',        3),
  ('Get Involved', 2, 'Race Results',           '/race-results',         4),
  ('Get Involved', 2, 'Leaderboard',            '/leaderboard',          5),
  ('Get Involved', 2, 'Sponsor With RTG',       '/sponsors',             6),
  ('Get Involved', 2, 'Become Chapter Captain', '/contact',              7),
  ('More',         3, 'Store',                  '/merchandise',          1),
  ('More',         3, 'Kit',                    '/merchandise',          2),
  ('More',         3, 'Resources',              '/blog',                 3),
  ('More',         3, 'Safety',                 '/safety',               4),
  ('More',         3, 'FAQ',                    '/faq',                  5),
  ('More',         3, 'Contact',                '/contact',              6),
  ('More',         3, 'Media',                  '/contact',              7),
  ('Legal',        4, 'Community Guidelines',   '/community-guidelines', 1),
  ('Legal',        4, 'Privacy Policy',         '/privacy',              2),
  ('Legal',        4, 'Terms',                  '/terms',                3)
) as starter
where not exists (select 1 from footer_links);
