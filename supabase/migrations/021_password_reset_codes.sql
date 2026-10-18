-- ============================================================================
-- Migration 021 — Our own password-reset codes and links
-- ============================================================================
-- Run AFTER 020, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Forgot-password no longer goes through Supabase's mailer (2 emails/hour
-- for the whole project). api-lib/passwordReset.js now makes the code and
-- the link itself, sends them through Brevo, and keeps track of them here.
--
-- Only HMACs of the code and the link token are stored, never the values
-- themselves. Nothing in the browser can read this table: RLS is on with no
-- policies, so only the service-role key (the serverless functions) gets in.
--
-- A row is written for every request, including ones for addresses with no
-- account (user_id null, nothing sent). That keeps the rate limits behaving
-- identically either way, so the form can't be used to test which
-- addresses have accounts.
-- ============================================================================

create table if not exists password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete cascade,
  code_hash text,
  link_hash text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  request_ip text,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_codes_email_idx on password_reset_codes (email, created_at desc);
create index if not exists password_reset_codes_ip_idx on password_reset_codes (request_ip, created_at desc);
create unique index if not exists password_reset_codes_link_idx on password_reset_codes (link_hash) where link_hash is not null;

alter table password_reset_codes enable row level security;

comment on table password_reset_codes is
  'Forgot-password codes and links, as HMACs. Server-only (RLS on, no policies). See api-lib/passwordReset.js.';
