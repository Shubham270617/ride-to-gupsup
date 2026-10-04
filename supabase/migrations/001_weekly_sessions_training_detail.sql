-- ============================================================================
-- Migration 001 — Weekly Sessions: training-format detail fields
-- ============================================================================
-- Adds the admin-editable fields the Home page's "Training Formats" section
-- needs (a dedicated hero photo per session, a row of short tags, a numbered
-- step-by-step breakdown, and a few highlight stats) — none of this existed
-- on weekly_sessions before, it was all hardcoded/missing.
--
-- Safe to re-run (every statement is `if not exists` / idempotent). All four
-- columns are nullable — existing sessions and the frontend both fall back
-- gracefully when they're empty, so this never breaks a session that hasn't
-- been enriched with this detail yet.
--
-- Field formats (kept as plain text, not jsonb, so they use the same simple
-- text/textarea inputs as everything else in the admin form system —
-- no new "repeater" field type needed):
--   image_url   — single image, same convention as every other *_url field
--                 (events.cover_image_url, products.image_url, etc).
--   tags        — comma-separated short labels, e.g.
--                 "Friday 5:00 AM, Ride + Run, Mobility Finish, Community Training"
--   steps       — one step per line, "Label | Duration", e.g.
--                 "Ride | 60 min\nTransition | Bike -> Run\nRun | 30 min\nFinish | Mobility"
--   highlights  — one highlight per line, "Label | Value", e.g.
--                 "Format | 60 Min Ride + 30 Min Run\nFocus | Endurance, Pacing, Adaptation"
-- Parsing of tags/steps/highlights into arrays happens client-side in
-- src/lib/publicData.js (mapWeeklySessionRow) — the DB just stores the raw
-- text an admin typed.
-- ============================================================================

alter table weekly_sessions add column if not exists image_url text;
alter table weekly_sessions add column if not exists tags text;
alter table weekly_sessions add column if not exists steps text;
alter table weekly_sessions add column if not exists highlights text;

comment on column weekly_sessions.image_url is 'Hero photo for this session on Home''s Training Formats section — falls back to a generic RTG photo if empty.';
comment on column weekly_sessions.tags is 'Comma-separated short tags, e.g. "Friday 5:00 AM, Ride + Run, Mobility Finish". Optional — derived from day/time/format if empty.';
comment on column weekly_sessions.steps is 'One step per line as "Label | Duration", e.g. "Ride | 60 min". Optional — a single generic step is shown from `format` if empty.';
comment on column weekly_sessions.highlights is 'One highlight per line as "Label | Value", e.g. "Focus | Endurance, Pacing". Optional — derived from difficulty/pace_group/cost if empty.';
