-- ============================================================================
-- Migration 035 — Remove "My owner code" (owner Advanced Settings codes)
-- ============================================================================
-- Run AFTER 034, in the Supabase SQL Editor. Safe to re-run.
--
-- Owner codes and volunteer codes share one table, ridge_timing_codes (owner
-- codes have scope = 'advanced'), so there is no separate table to drop.
-- This migration:
--   * DELETES every owner code, and every browser signed in with one;
--   * changes the table's rules so an owner code can never be created again;
--   * removes the owner-code path from ridge_code_commit().
-- Volunteer timing codes are untouched. The code audit history is kept.
-- The owner manages riders, sessions and timing in Admin -> Ridge.
-- ============================================================================

delete from public.ridge_timing_code_sessions
where code_id in (select id from public.ridge_timing_codes where scope = 'advanced');

delete from public.ridge_timing_codes where scope = 'advanced';

alter table public.ridge_timing_codes drop constraint if exists ridge_timing_codes_scope_check;
alter table public.ridge_timing_codes add constraint ridge_timing_codes_scope_check
  check (scope in ('timing', 'session_timing'));

alter table public.ridge_timing_codes drop constraint if exists ridge_timing_codes_binding_check;
alter table public.ridge_timing_codes add constraint ridge_timing_codes_binding_check
  check ((scope = 'timing' and user_id is not null and session_id is not null)
      or (scope = 'session_timing' and user_id is null and session_id is not null
          and roster_rider_ids is not null and cardinality(roster_rider_ids) > 0));

create or replace function public.ridge_code_commit(p_session_hash text,p_credential uuid,p_expected bigint,p_request uuid,p_command jsonb,p_state jsonb,p_feed jsonb,p_audit jsonb) returns bigint language plpgsql security invoker set search_path='' as $$
declare access jsonb; v bigint; prior public.ridge_audit%rowtype;
begin
 -- Same transaction keeps credential/assignment share locks until native commit.
 perform 1 from public.ridge_workspace where singleton for update;
 access:=public.ridge_code_access('read',jsonb_build_object('sessionHash',p_session_hash));
 if access is null then raise exception 'Code expired or revoked' using errcode='42501';end if;
 if (access->>'credentialId')::uuid is distinct from p_credential then raise exception 'Code changed' using errcode='42501';end if;
 select * into prior from public.ridge_audit where request_id=p_request;
 if found and prior.details->>'credentialId' is distinct from p_credential::text then raise exception 'Receipt belongs to another credential' using errcode='42501';end if;
 if access->>'codeKind'='session_timing' then
  return public.ridge_session_code_commit(p_session_hash,p_credential,p_expected,p_request,p_command,p_state,p_feed);
 elsif access->>'scope'='timing' then
  if p_command->>'sessionId' is distinct from access->>'sessionId' then raise exception 'Session refused' using errcode='42501';end if;
  v:=public.ridge_timing_commit(p_expected,p_request,(access->>'userId')::uuid,p_command,p_state,p_feed);
  if prior.request_id is null then update public.ridge_audit set details=details||jsonb_build_object('credentialId',p_credential) where request_id=p_request;end if;
 else
  -- Owner ("Advanced Settings") codes were removed; nothing else may write.
  raise exception 'Owner codes were removed' using errcode='42501';
 end if;
 return v;
end $$;

-- Check: should be 0.
select count(*) as owner_codes_left from public.ridge_timing_codes where scope = 'advanced';
