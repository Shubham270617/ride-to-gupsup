-- INACTIVE: explicit TEST bearer-code activation approval required.
-- Existing named-account codes and owner codes retain their current boundaries.
begin;
alter table public.ridge_timing_codes add column roster_rider_ids text[];
alter table public.ridge_timing_codes drop constraint ridge_timing_codes_scope_check;
alter table public.ridge_timing_codes drop constraint ridge_timing_codes_check;
alter table public.ridge_timing_codes add constraint ridge_timing_codes_scope_check check(scope in ('timing','advanced','session_timing'));
alter table public.ridge_timing_codes add constraint ridge_timing_codes_binding_check check(scope='advanced' or (scope='timing' and user_id is not null and session_id is not null) or (scope='session_timing' and user_id is null and session_id is not null and roster_rider_ids is not null and cardinality(roster_rider_ids)>0));
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
  if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'scope',scope,'userId',user_id,'sessionId',session_id,'expiresAt',expires_at,'revokedAt',revoked_at)) from public.ridge_timing_codes where issuer_id=actor),'[]');end if;
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
  insert into public.ridge_timing_codes(code_hash,issuer_id,scope,user_id,session_id,assignment_revision,expires_at,roster_rider_ids) values(p_data->>'codeHash',actor,p_data->>'scope',a.user_id,case when p_data->>'scope'='session_timing' then p_data->>'sessionId' else a.session_id end,a.revision,expiry,allowed_roster) returning * into c;
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
 result:=jsonb_build_object('credentialId',c.id,'scope',case when c.scope='session_timing' then 'timing' else c.scope end,'codeKind',c.scope,'issuerId',c.issuer_id,'userId',c.user_id,'sessionId',c.session_id,'rosterIds',to_jsonb(case when c.scope='session_timing' then allowed_roster else a.roster_rider_ids end),'expiresAt',extract(epoch from expiry)*1000);
 return result;
end $$;

create or replace function public.ridge_session_code_commit(p_session_hash text,p_credential uuid,p_expected bigint,p_request uuid,p_command jsonb,p_state jsonb,p_feed jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare
 g public.ridge_timing_assignments%rowtype; access jsonb; p_actor uuid; w public.ridge_workspace%rowtype;
 prior public.ridge_audit%rowtype; old_session jsonb; expected_session jsonb;
 old_entry jsonb; new_entry jsonb; entries jsonb := '[]'; laps jsonb; lap jsonb;
 target integer; lap_index integer; stamp bigint; kind text := p_command->>'type';
 rider text; permitted_keys text[]; expected_state jsonb;
begin
 if p_expected is null or p_expected<0 or p_request is null or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'Invalid request' using errcode='22023'; end if;
 -- Lock order matches workspace writer, then assignment. Revocation updates
 -- the assignment row, so it serializes with authorization of each commit.
 select * into strict w from public.ridge_workspace where singleton for update;
 access:=public.ridge_code_access('read',jsonb_build_object('sessionHash',p_session_hash));
 if access is null or access->>'codeKind' is distinct from 'session_timing' or (access->>'credentialId')::uuid is distinct from p_credential or access->>'sessionId' is distinct from p_command->>'sessionId' then raise exception 'Session code refused' using errcode='42501';end if;
 p_actor:=(access->>'issuerId')::uuid;
 g.session_id:=access->>'sessionId';
 select array_agg(value) into g.roster_rider_ids from jsonb_array_elements_text(access->'rosterIds');
 if kind is null or kind not in ('attendance','group_start','start','end','pass') then
   raise exception 'Command not allowed' using errcode='42501';
 end if;
 permitted_keys := case when kind='attendance' then array['type','sessionId','riderIds']
 when kind='group_start' then array['type','sessionId','at'] else array['type','sessionId','riderId','lap','at'] end;
 if exists(select 1 from jsonb_object_keys(p_command) k where not k=any(permitted_keys)) then
   raise exception 'Unexpected command fields' using errcode='42501'; end if;
 select * into prior from public.ridge_audit where request_id=p_request;
 if found then
   if prior.actor_id<>p_actor or prior.details->>'credentialId' is distinct from p_credential::text or prior.details->'command' is distinct from p_command then
     raise exception 'Request ID conflict' using errcode='23505'; end if;
   return prior.version;
 end if;
 if w.version<>p_expected then raise exception 'Version changed' using errcode='40001'; end if;
 select value,ordinality::integer-1 into old_session,target from jsonb_array_elements(w.state->'sessions') with ordinality
 where value->>'id'=g.session_id;
 if old_session is null or old_session->>'mode' not in ('live','testing') or old_session->>'finished' is distinct from 'false' then
   raise exception 'Session not open' using errcode='42501'; end if;
 if exists(select 1 from jsonb_array_elements(old_session->'entries') e where not (e->>'riderId'=any(g.roster_rider_ids))) then
   raise exception 'Roster assignment incomplete' using errcode='42501'; end if;
 if kind='attendance' then
   if jsonb_typeof(p_command->'riderIds') is distinct from 'array' then raise exception 'Invalid attendance'; end if;
   if exists(select 1 from jsonb_array_elements(old_session->'entries') e where
     not (p_command->'riderIds' ? (e->>'riderId')) and (e ? 'officialScore' or jsonb_array_length(e->'laps')>0)) then
     raise exception 'Recorded rider cannot be removed'; end if;
   for rider in select distinct value from jsonb_array_elements_text(p_command->'riderIds') loop
     if not rider=any(g.roster_rider_ids) or not exists(select 1 from jsonb_array_elements(w.state->'riders') r where r->>'id'=rider) then
       raise exception 'Rider not assigned' using errcode='42501'; end if;
   end loop;
   -- Retain caller ordering, but refuse duplicate roster entries.
   if jsonb_array_length(p_command->'riderIds')<>(select count(distinct value) from jsonb_array_elements_text(p_command->'riderIds')) then raise exception 'Duplicate attendance'; end if;
   for rider in select value from jsonb_array_elements_text(p_command->'riderIds') loop
     select value into old_entry from jsonb_array_elements(old_session->'entries') where value->>'riderId'=rider;
     entries := entries || jsonb_build_array(coalesce(old_entry,jsonb_build_object('riderId',rider,'laps','[]'::jsonb,'adjustment',0)));
   end loop;
 else
   if kind='group_start' and jsonb_array_length(old_session->'entries')=0 then raise exception 'Mark attendance first'; end if;
   stamp := (p_command->>'at')::bigint;
   if stamp is null or abs(extract(epoch from clock_timestamp())*1000-stamp)>600000 or
      (old_session->>'mode'<>'testing' and
       to_char(to_timestamp(stamp/1000.0) at time zone 'Asia/Kolkata','YYYY-MM-DD')<>old_session->>'date') then
     raise exception 'Invalid tap time'; end if;
   if kind<>'group_start' and not exists(select 1 from jsonb_array_elements(old_session->'entries') e where e->>'riderId'=p_command->>'riderId') then raise exception 'Rider absent'; end if;
   for old_entry in select value from jsonb_array_elements(old_session->'entries') loop
     new_entry:=old_entry;
     if kind='group_start' or old_entry->>'riderId'=p_command->>'riderId' then
       if old_entry ? 'officialScore' then raise exception 'Official history locked'; end if;
       laps:=old_entry->'laps';
       if kind='group_start' then
         if jsonb_array_length(laps)<>0 then raise exception 'Already started'; end if;
         laps:=jsonb_build_array(jsonb_build_object('start',stamp,'end',null));
       else
         lap_index:=(p_command->>'lap')::integer-1;
         if lap_index is null or lap_index<0 or lap_index>4 or lap_index>jsonb_array_length(laps) then raise exception 'Invalid lap'; end if;
         lap:=laps->lap_index;
         if kind='start' then
           if lap is not null and (lap->>'start' is not null or lap->>'end' is not null or lap->>'durationMs' is not null) then raise exception 'Lap already recorded'; end if;
           if lap_index>0 and coalesce((laps->(lap_index-1)->>'durationMs')::bigint,(laps->(lap_index-1)->>'end')::bigint-(laps->(lap_index-1)->>'start')::bigint,0)<=0 then raise exception 'Previous lap incomplete'; end if;
           if lap_index>0 and (laps->(lap_index-1)->>'end')::bigint>stamp then raise exception 'Start precedes previous finish'; end if;
           laps:=jsonb_set(laps,array[lap_index::text],jsonb_build_object('start',stamp,'end',null),true);
         else
           if lap->>'start' is null or lap->>'end' is not null or lap->>'durationMs' is not null or stamp<=(lap->>'start')::bigint or stamp-(lap->>'start')::bigint>86400000 then raise exception 'Lap not running'; end if;
           laps:=jsonb_set(laps,array[lap_index::text],lap||jsonb_build_object('end',stamp));
           if kind='pass' then
             if lap_index>=4 or jsonb_array_length(laps)<>lap_index+1 then raise exception 'Cannot pass'; end if;
             laps:=laps||jsonb_build_array(jsonb_build_object('start',stamp,'end',null));
           end if;
         end if;
       end if;
       new_entry:=jsonb_set(old_entry,'{laps}',laps);
     end if;
     entries:=entries||jsonb_build_array(new_entry);
   end loop;
 end if;
 expected_session:=jsonb_set(old_session,'{entries}',entries);
 expected_state:=jsonb_set(w.state,array['sessions',target::text],expected_session);
 if p_state is distinct from expected_state then raise exception 'Change exceeds timing scope' using errcode='42501'; end if;
 if jsonb_typeof(p_feed->'results') is distinct from 'array' then raise exception 'Invalid server feed'; end if;
 -- Feed is generated by the trusted API's existing native engine, never accepted
 -- from a client. No authenticated/anonymous caller can execute this function.
 update public.ridge_workspace set state=p_state,version=w.version+1,updated_at=now() where singleton;
 update public.ridge_publication set feed=p_feed,version=w.version+1,updated_at=now() where singleton;
 if not found then raise exception 'Publication missing' using errcode='P0002'; end if;
 insert into public.ridge_audit(request_id,version,actor_id,action,details)
 values(p_request,w.version+1,p_actor,kind,jsonb_build_object('type',kind,'command',p_command,'operatorScope','session_code','credentialId',p_credential,'operatorIdentity','unverified code holder'));
 return w.version+1;
end;
$$;
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
  if p_command->>'type' not in ('create_session','create_rider','edit_rider','correct_lap','correct_points','finish_session','reopen_session') then raise exception 'Advanced action refused' using errcode='42501';end if;
  if p_audit->'command' is distinct from p_command then raise exception 'Audit mismatch' using errcode='42501';end if;
  v:=public.ridge_commit(p_expected,p_request,(access->>'issuerId')::uuid,p_state,p_feed,p_audit||jsonb_build_object('credentialId',access->>'credentialId'));
 end if;
 return v;
end $$;

revoke all on function public.ridge_session_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ridge_session_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
