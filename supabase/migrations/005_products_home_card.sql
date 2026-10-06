-- ============================================================================
-- Migration 005 — Products: Home "Merchandise Highlights" card label
-- ============================================================================
-- Run AFTER 004, in the Supabase SQL Editor. Safe to re-run.
--
-- 1. products.eyebrow — the small orange line above a product's name on
--    Home's "Merchandise Highlights" cards (e.g. "Performance", "Everyday").
--    Optional; the line is simply left out when empty. Everything else on
--    the card already exists: Tag (the pill on the photo), Name,
--    Description, Product Photo, Sizes and In Stock.
--
-- 2. Removes the saved wording for the OLD Home merchandise heading
--    ("text.home.store.*"). The rebuilt section reads "text.home.merch.*"
--    instead (Admin -> Site Content -> Home), so those rows are unused.
--    This deletes that old heading text — nothing else.
-- ============================================================================

alter table products add column if not exists eyebrow text;

comment on column products.eyebrow is 'Small line above the product name on Home''s Merchandise Highlights cards, e.g. "Performance". Optional.';

delete from site_settings where key like 'text.home.store.%';
