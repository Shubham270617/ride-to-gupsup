-- ============================================================================
-- Migration 006 — Remove saved wording for the old Home gallery/testimonials
-- ============================================================================
-- Run AFTER 005, in the Supabase SQL Editor. Safe to re-run.
--
-- No table or column changes. The rebuilt "Community Gallery" and
-- "What People Say" sections on Home read the existing gallery_items and
-- testimonials tables as they are; only their heading wording moved to new
-- keys (text.home.gallery.<field> / text.home.voices.<field>, edited in
-- Admin -> Site Content -> Home).
--
-- This deletes the heading text saved for the OLD versions of those two
-- sections, which nothing reads any more:
--   text.home.gallery.eyebrow / .title / .subtitle
--   text.home.testimonials.eyebrow / .title / .subtitle
-- It does not touch any photo, video or testimonial.
-- ============================================================================

delete from site_settings
where key in (
  'text.home.gallery.eyebrow',
  'text.home.gallery.title',
  'text.home.gallery.subtitle'
)
or key like 'text.home.testimonials.%';
