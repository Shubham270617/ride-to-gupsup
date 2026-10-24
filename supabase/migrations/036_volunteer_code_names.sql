-- ============================================================================
-- Migration 036 — Volunteer codes carry the volunteer's name
-- ============================================================================
-- Run AFTER 035, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Admin -> Ridge — Access codes now asks who a volunteer code is for. The
-- name is stored with the code, shown in the "Issued codes" list (newest
-- first) and on that volunteer's timer. Codes made before this have no name.
-- Only ridge_code_access() changes (issue / list / read).
-- ============================================================================

alter table public.ridge_timing_codes add column if not exists volunteer_name text;
alter table public.ridge_timing_codes drop constraint if exists ridge_timing_codes_volunteer_name_check;
alter table public.ridge_timing_codes add constraint ridge_timing_codes_volunteer_name_check
  check (volunteer_name is null or length(volunteer_name) <= 80);

create or replace function public.ridge_code_access(p_action text,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.ridge_timing_codes%rowtype; a public.ridge_timing_assignments%rowtype; s public.ridge_timing_code_sessions%rowtype; k text; n integer; permitted boolean:=true; expiry timestamptz; actor uuid; result jsonb; selected_session jsonb; allowed_roster text[];
begin
 if p_action='rate' then
  -- Sort keys for deterministic locking; both global and network counters increment.
  if jsonb_array_length(p_data->'keys')<>2 then raise exception 'Invalid limiter';end if;
  for k in select jsonb_array_elements_text(p_data->'keys') order by 1 loop
   insert into public.ridge_timing_code_rates values(k,clock_timestamp(),1) on conflict(key) do update set started_at=case when ridge_timing_code_rates.started_at<clock_timestamp()-interval '1 minute' then clock_timestamp() else ridge_timing_code_rates.started_at end,attempts=case when ridge_timing_code_rates.started_at<clock_timestamp()-interval '1 minute' then 1 else ridge_timing_code_rates.attempts+1 end returning attempts into n;
   if n>(case when k=p_data->>'global' then 100 else 5 end) then permitted:=false;end if;
  end loop;
  delete from public.ridge_timing_code_rates where started_at<clock_timestamp()-interval '1 day';
  return to_jsonb(permitted);
 end if;
 if p_action in ('issue','revoke','list') then
  actor:=(p_data->>'actor')::uuid;
  if not exists(select 1 from public.admin_profiles where id=actor) then raise exception 'Owner required' using errcode='42501';end if;
  if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'scope',scope,'userId',user_id,'sessionId',session_id,'expiresAt',expires_at,'revokedAt',revoked_at,'volunteerName',volunteer_name,'createdAt',created_at) order by created_at desc) from public.ridge_timing_codes where issuer_id=actor),'[]');end if;
  if p_action='revoke' then
   update public.ridge_timing_codes set revoked_at=coalesce(revoked_at,clock_timestamp()) where id=(p_data->>'id')::uuid and issuer_id=actor returning * into c;
   if not found then raise exception 'Code not found' using errcode='42501';end if;
   insert into public.ridge_timing_code_audit(code_id,actor_id,action) values(c.id,actor,'revoke');return jsonb_build_object('revoked',true);
  end if;
  expiry:=(p_data->>'expiresAt')::timestamptz;
  if expiry<=clock_timestamp() or expiry>clock_timestamp()+interval '24 hours' then raise exception 'Invalid expiry';end if;
  if p_data->>'scope'='session_timing' then
   perform 1 from public.ridge_workspace where singleton for update;
   select value into selected_session from public.ridge_workspace w,jsonb_array_elements(w.state->'sessions') where w.singleton and value->>'id'=p_data->>'sessionId';
   if selected_session is null or selected_session->>'finished' is distinct from 'false' or selected_session->>'mode' not in ('testing','live') or exists(select 1 from jsonb_array_elements(selected_session->'entries') e where e ? 'officialScore') then raise exception 'Open nonhistorical session required' using errcode='42501';end if;
   select array_agg(r->>'id') into allowed_roster from public.ridge_workspace w,jsonb_array_elements(w.state->'riders') r where w.singleton;
   if coalesce(cardinality(allowed_roster),0)=0 then raise exception 'Session roster unavailable';end if;
  elsif p_data->>'scope'='timing' then
   select * into a from public.ridge_timing_assignments where user_id=(p_data->>'userId')::uuid and session_id=p_data->>'sessionId' for share;
   if not found or a.revoked_at is not null or a.expires_at<=clock_timestamp() then raise exception 'Active assignment required' using errcode='42501';end if;
   expiry:=least(expiry,a.expires_at);
  elsif p_data->>'scope'<>'advanced' then raise exception 'Invalid scope';end if;
  insert into public.ridge_timing_codes(code_hash,issuer_id,scope,user_id,session_id,assignment_revision,expires_at,roster_rider_ids,volunteer_name) values(p_data->>'codeHash',actor,p_data->>'scope',a.user_id,case when p_data->>'scope'='session_timing' then p_data->>'sessionId' else a.session_id end,a.revision,expiry,allowed_roster,nullif(left(btrim(coalesce(p_data->>'volunteerName','')),80),'')) returning * into c;
  insert into public.ridge_timing_code_audit(code_id,actor_id,action) values(c.id,actor,'issue');return jsonb_build_object('id',c.id,'expiresAt',c.expires_at);
 end if;
 if p_action='logout' then delete from public.ridge_timing_code_sessions where session_hash=p_data->>'sessionHash';return '{}'::jsonb;end if;
 if p_action='exchange' then select * into c from public.ridge_timing_codes where code_hash=p_data->>'codeHash' for share;
 else
  select * into s from public.ridge_timing_code_sessions where session_hash=p_data->>'sessionHash';
  if not found or s.expires_at<=clock_timestamp() then return null;end if;
  select * into c from public.ridge_timing_codes where id=s.code_id for share;
 end if;
 if c.id is null or c.revoked_at is not null or c.expires_at<=clock_timestamp() or not exists(select 1 from public.admin_profiles where id=c.issuer_id) then return null;end if;
 if c.scope='session_timing' then
  select value into selected_session from public.ridge_workspace w,jsonb_array_elements(w.state->'sessions') where w.singleton and value->>'id'=c.session_id;
  if selected_session is null or selected_session->>'finished' is distinct from 'false' or selected_session->>'mode' not in ('testing','live') then return null;end if;
  allowed_roster:=c.roster_rider_ids;
 elsif c.scope='timing' then
  select * into a from public.ridge_timing_assignments where user_id=c.user_id and session_id=c.session_id for share;
  if not found or a.revoked_at is not null or a.expires_at<=clock_timestamp() or a.revision<>c.assignment_revision then return null;end if;
 end if;
 expiry:=least(c.expires_at,clock_timestamp()+interval '20 minutes');
 if p_action='exchange' then
  delete from public.ridge_timing_code_sessions where expires_at<clock_timestamp();
  insert into public.ridge_timing_code_sessions values(p_data->>'sessionHash',c.id,expiry,clock_timestamp());
  insert into public.ridge_timing_code_audit(code_id,actor_id,action) values(c.id,c.user_id,'exchange');
 else expiry:=s.expires_at;end if;
 result:=jsonb_build_object('credentialId',c.id,'volunteerName',c.volunteer_name,'scope',case when c.scope='session_timing' then 'timing' else c.scope end,'codeKind',c.scope,'issuerId',c.issuer_id,'userId',c.user_id,'sessionId',c.session_id,'rosterIds',to_jsonb(case when c.scope='session_timing' then allowed_roster else a.roster_rider_ids end),'expiresAt',extract(epoch from expiry)*1000);
 return result;
end $$;
