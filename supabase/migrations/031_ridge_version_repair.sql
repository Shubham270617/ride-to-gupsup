-- ============================================================================
-- Migration 031 — Repair Ridge so saves work again
-- ============================================================================
-- Run in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Symptoms this fixes:
--   * "Unable to load Ridge sessions" (Access codes -> Volunteer timing code)
--   * "Code or operation unavailable" right after entering a timer code
--   * "Access or records changed. Reconcile before another action." on every
--     save (add rider, create session, timing)
--
-- Every Ridge save writes the next version number to ridge_workspace,
-- ridge_publication and ridge_audit, and ridge_audit.version must be unique.
-- On the live database the single ridge_workspace row had gone missing (so
-- nothing could load) and was re-created at version 0 while ridge_audit
-- still held earlier saves; each new save then tried to reuse an existing
-- audit version and was refused.
--
-- This makes sure both single rows exist, and moves their version up to the
-- newest audit entry so the next save gets a fresh number. Riders, sessions
-- and the audit trail are not touched.
-- ============================================================================

insert into public.ridge_workspace(state)
values ('{"schemaVersion":1,"riders":[],"sessions":[]}')
on conflict do nothing;

insert into public.ridge_publication(feed)
values ('{"sessions":[],"results":[],"awards":[],"spotlights":[]}')
on conflict do nothing;

update public.ridge_workspace
set version = greatest(version, (select coalesce(max(version), 0) from public.ridge_audit))
where singleton;

update public.ridge_publication
set version = (select version from public.ridge_workspace where singleton)
where singleton;

-- Have the database API pick up the Ridge tables if it hadn't.
notify pgrst, 'reload schema';

-- Check: all three numbers should be equal.
select
  (select version from public.ridge_workspace where singleton)   as workspace_version,
  (select version from public.ridge_publication where singleton) as publication_version,
  (select coalesce(max(version), 0) from public.ridge_audit)      as newest_audit_version;
