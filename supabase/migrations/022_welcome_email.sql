-- ============================================================================
-- Migration 022 — Welcome email, sent once per member
-- ============================================================================
-- Run AFTER 021, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- api-lib/welcomeEmail.js sends a welcome email through Brevo the first time
-- a new member is signed in, and records it here so it never goes twice.
--
-- Everyone who already has an account is marked as welcomed, so turning
-- this on doesn't email the whole existing membership at once. (Re-running
-- only touches rows that are still empty, i.e. brand-new members who
-- haven't been welcomed yet — and the server only welcomes accounts under
-- a week old anyway.)
-- ============================================================================

alter table profiles add column if not exists welcome_email_sent_at timestamptz;

update profiles
set welcome_email_sent_at = coalesce(created_at, now())
where welcome_email_sent_at is null
  and created_at < now() - interval '7 days';

comment on column profiles.welcome_email_sent_at is
  'When the welcome email was sent (api-lib/welcomeEmail.js). Null = not sent yet.';
