-- ============================================================================
-- Migration 013 — Store page: product categories + the fields its new
-- sections need
-- ============================================================================
-- Run AFTER 012, in the Supabase SQL Editor. Safe to re-run. Every existing
-- product and order stays as it is; step 3 at the bottom DELETES the old
-- Store page's size chart, reviews and wording (listed there).
--
-- The Store page (/merchandise) is drawn from the products table, as
-- before, plus:
--
-- 1. store_categories — the tabs above the product list (Performance,
--    Core …). Admin -> Store — Categories.
--
-- 2. New columns on products (Admin -> Merchandise), all optional:
--      category_slug  the tab the product sits under
--      use_text       the "Use" box            (e.g. Training + Long Rides)
--      drop_text      the "Drop" box           (e.g. Core Performance)
--      watermark      big faint word behind its photo (e.g. Jersey)
--      color          its two accent colours — the gradient of its badge,
--      color_alt      button, number tile and the glow around its photo
--      featured       show it in the hero's "Featured Drop" rotator
--      in_kit         offer it as a piece of the "Build Your Kit" section
--      kit_label      its short name there    (e.g. Jersey)
--      limited        it is the product the "Limited / Event Edition" card
--                     previews
--    A product's existing Tag is its badge, and its existing "small line
--    above the name" is its category line (e.g. Performance / Cycling).
--
-- The page's headings, labels and paragraphs — and the bag drawer's and
-- checkout page's — live in site_settings under "text.store.<field>"
-- (Admin -> Site Content -> Store).
-- ============================================================================

-- 1. Categories --------------------------------------------------------------

create table if not exists store_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
begin
  execute 'alter table store_categories enable row level security';
  execute 'drop policy if exists "store_categories public read" on store_categories';
  execute 'create policy "store_categories public read" on store_categories for select using (published = true or is_admin())';
  execute 'drop policy if exists "store_categories admin insert" on store_categories';
  execute 'create policy "store_categories admin insert" on store_categories for insert with check (is_admin())';
  execute 'drop policy if exists "store_categories admin update" on store_categories';
  execute 'create policy "store_categories admin update" on store_categories for update using (is_admin())';
  execute 'drop policy if exists "store_categories admin delete" on store_categories';
  execute 'create policy "store_categories admin delete" on store_categories for delete using (is_admin())';
end $$;

-- Starter categories — ONLY if there are none yet.
insert into store_categories (slug, name, sort_order)
select * from (values
  ('performance', 'Performance', 1),
  ('core', 'Core', 2),
  ('event', 'Event Editions', 3),
  ('essential', 'Essentials', 4)
) as starter
where not exists (select 1 from store_categories);

-- 2. Product fields ----------------------------------------------------------

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

-- 3. Remove what the new page replaces. THIS DELETES DATA: the old Store
--    page's Size Chart and Athlete Reviews (their tables are dropped with
--    every row in them), its saved headings, its Shipping / Returns /
--    Member Discount wording, and its old hero photo. The new page shows
--    none of them. Products, orders and the UPI payment settings are NOT
--    touched.

drop table if exists size_guide;
drop table if exists merch_reviews;

delete from site_settings
where key like 'text.merch.hero.%'
   or key like 'text.merch.perks.%'
   or key like 'text.merch.sizeChart.%'
   or key like 'text.merch.reviews.%'
   or key in ('text.merch.shipping', 'text.merch.returns', 'text.merch.memberDiscount');

-- An uploaded hero photo is queued for the daily clean-up first, so its
-- file doesn't stay behind in storage.
insert into media_pending_deletions (url)
select url from site_images where key = 'merchHero';

delete from site_images where key = 'merchHero';
