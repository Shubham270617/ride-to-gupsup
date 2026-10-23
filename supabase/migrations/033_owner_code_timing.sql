-- ============================================================================
-- Migration 033 — The owner code can also take attendance and time laps
-- ============================================================================
-- Run AFTER 031, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Until now an "Owner Advanced Settings" code could only set things up
-- (riders, sessions, corrections, finish/reopen); attendance and lap timing
-- needed a separate volunteer code, which made the timer page confusing.
-- Now one owner code runs a whole session. Volunteer codes are unchanged:
-- they still only time the one session they were made for.
--
-- Only ridge_code_commit() changes: its owner-code list gains attendance,
-- group_start, start, pass and end. The new state is still computed by the
-- server from the saved workspace (never sent by the browser), checked, and
-- written with an audit entry by ridge_commit(), exactly as before.
-- ============================================================================

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
  if p_command->>'type' not in ('create_session','create_rider','edit_rider','correct_lap','correct_points','finish_session','reopen_session','attendance','group_start','start','pass','end') then raise exception 'Advanced action refused' using errcode='42501';end if;
  if p_audit->'command' is distinct from p_command then raise exception 'Audit mismatch' using errcode='42501';end if;
  v:=public.ridge_commit(p_expected,p_request,(access->>'issuerId')::uuid,p_state,p_feed,p_audit||jsonb_build_object('credentialId',access->>'credentialId'));
 end if;
 return v;
end $$;

