-- ============================================================================
-- Migration 007 — Remove saved wording for the Home "Sponsors" band
-- ============================================================================
-- Run AFTER 006, in the Supabase SQL Editor. Safe to re-run.
--
-- The "Our Sponsors & Partners" band was removed from the Home page (it is
-- not part of the reference design). This deletes the heading and button
-- text that had been saved for it, which nothing reads any more:
--   text.home.sponsors.eyebrow / .title / .subtitle / .buttonLabel
--
-- It does NOT touch the sponsors themselves: the sponsors, sponsor_tiers
-- and sponsor_opportunities tables still feed the separate /sponsors page.
-- ============================================================================

delete from site_settings where key like 'text.home.sponsors.%';
