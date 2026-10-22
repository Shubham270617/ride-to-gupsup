-- REVIEW CANDIDATE ONLY. Not an installed migration. Inserts no assignments.
-- Convert to a CLI-generated migration after security review.
begin;
create table public.ridge_timing_assignments (
 user_id uuid not null references auth.users(id), session_id text not null,
 roster_rider_ids text[] not null default '{}', expires_at timestamptz not null,
 revoked_at timestamptz, assigned_by uuid not null references public.admin_profiles(id),
 created_at timestamptz not null default now(), revision bigint not null default 1,
 primary key(user_id,session_id)
);
alter table public.ridge_timing_assignments enable row level security;
revoke all on public.ridge_timing_assignments from public,anon,authenticated;
grant select,insert,update,delete on public.ridge_timing_assignments to service_role;

create function public.ridge_timing_commit(p_expected bigint,p_request uuid,p_actor uuid,p_command jsonb,p_state jsonb,p_feed jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare
 g public.ridge_timing_assignments%rowtype; w public.ridge_workspace%rowtype;
 prior public.ridge_audit%rowtype; old_session jsonb; expected_session jsonb;
 old_entry jsonb; new_entry jsonb; entries jsonb := '[]'; laps jsonb; lap jsonb;
 target integer; lap_index integer; stamp bigint; kind text := p_command->>'type';
 rider text; permitted_keys text[]; expected_state jsonb;
begin
 if p_expected is null or p_expected<0 or p_request is null or jsonb_typeof(p_command) is distinct from 'object' then raise exception 'Invalid request' using errcode='22023'; end if;
 -- Lock order matches workspace writer, then assignment. Revocation updates
 -- the assignment row, so it serializes with authorization of each commit.
 select * into strict w from public.ridge_workspace where singleton for update;
 select * into g from public.ridge_timing_assignments
 where user_id=p_actor and session_id=p_command->>'sessionId' for share;
 if not found or g.revoked_at is not null or g.expires_at<=clock_timestamp() then
   raise exception 'No current assignment' using errcode='42501';
 end if;
 if kind is null or kind not in ('attendance','group_start','start','end','pass') then
   raise exception 'Command not allowed' using errcode='42501';
 end if;
 permitted_keys := case when kind='attendance' then array['type','sessionId','riderIds']
 when kind='group_start' then array['type','sessionId','at'] else array['type','sessionId','riderId','lap','at'] end;
 if exists(select 1 from jsonb_object_keys(p_command) k where not k=any(permitted_keys)) then
   raise exception 'Unexpected command fields' using errcode='42501'; end if;
 select * into prior from public.ridge_audit where request_id=p_request;
 if found then
   if prior.actor_id<>p_actor or prior.details->'command' is distinct from p_command then
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
      to_char(to_timestamp(stamp/1000.0) at time zone 'Asia/Kolkata','YYYY-MM-DD')<>old_session->>'date' then
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
 values(p_request,w.version+1,p_actor,kind,jsonb_build_object('type',kind,'command',p_command,'operatorScope','assigned_timing'));
 return w.version+1;
end;
$$;
revoke all on function public.ridge_timing_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ridge_timing_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
create table public.ridge_timing_access_audit (
 request_id uuid primary key,actor_id uuid not null,user_id uuid not null,
 session_id text not null,revision bigint not null,command jsonb not null,
 before_assignment jsonb,created_at timestamptz not null default now()
);
alter table public.ridge_timing_access_audit enable row level security;
revoke all on public.ridge_timing_access_audit from public,anon,authenticated;
grant select,insert on public.ridge_timing_access_audit to service_role;

create function public.ridge_manage_timing_assignment(p_actor uuid,p_request uuid,p_user uuid,p_session text,p_roster text[],p_expires timestamptz,p_revoke boolean,p_expected bigint)
returns bigint language plpgsql security invoker set search_path='' as $$
declare prior public.ridge_timing_access_audit%rowtype; old public.ridge_timing_assignments%rowtype;
 s jsonb; w jsonb; command jsonb; next_revision bigint;
begin
 -- API additionally requires the existing explicit owner allowlist. This RPC
 -- is service-only; it never accepts direct authenticated/browser execution.
 if not exists(select 1 from public.admin_profiles where id=p_actor) then raise exception 'Admin required' using errcode='42501'; end if;
 if p_request is null or p_user is null or p_session is null or p_expected is null or p_expected<0 or p_revoke is null then raise exception 'Invalid assignment'; end if;
 select state into strict w from public.ridge_workspace where singleton for update;
 command:=jsonb_build_object('userId',p_user,'sessionId',p_session,'roster',p_roster,'expires',p_expires,'revoke',p_revoke,'expected',p_expected);
 select * into prior from public.ridge_timing_access_audit where request_id=p_request;
 if found then
  if prior.actor_id<>p_actor or prior.command is distinct from command then raise exception 'Request ID conflict' using errcode='23505';end if;
  return prior.revision;
 end if;
 select * into old from public.ridge_timing_assignments where user_id=p_user and session_id=p_session for update;
 if coalesce(old.revision,0)<>p_expected then raise exception 'Assignment changed' using errcode='40001';end if;
 next_revision:=coalesce(old.revision,0)+1;
 if p_revoke then
  if old.user_id is null then raise exception 'Assignment not found';end if;
  update public.ridge_timing_assignments set revoked_at=clock_timestamp(),revision=next_revision where user_id=p_user and session_id=p_session;
 else
  if p_expires is null or p_expires<=clock_timestamp() or p_expires>clock_timestamp()+interval '7 days' or coalesce(cardinality(p_roster),0)=0 or cardinality(p_roster)>500 then raise exception 'Expiry must be within seven days and roster explicit';end if;
  select value into s from jsonb_array_elements(w->'sessions') where value->>'id'=p_session;
  if s is null or s->>'finished' is distinct from 'false' or s->>'mode' not in ('testing','live') then raise exception 'Session must be open';end if;
  if exists(select 1 from unnest(p_roster) id where id is null or not exists(select 1 from jsonb_array_elements(w->'riders') r where r->>'id'=id)) or
     exists(select 1 from jsonb_array_elements(s->'entries') e where not(e->>'riderId'=any(p_roster)) or e ? 'officialScore') then raise exception 'Roster must include session riders and exclude official historical timing';end if;
  insert into public.ridge_timing_assignments(user_id,session_id,roster_rider_ids,expires_at,assigned_by,revision)
   values(p_user,p_session,p_roster,p_expires,p_actor,next_revision)
   on conflict(user_id,session_id) do update set roster_rider_ids=excluded.roster_rider_ids,expires_at=excluded.expires_at,revoked_at=null,assigned_by=p_actor,revision=next_revision;
 end if;
 insert into public.ridge_timing_access_audit(request_id,actor_id,user_id,session_id,revision,command,before_assignment)
 values(p_request,p_actor,p_user,p_session,next_revision,command,case when old.user_id is null then null else to_jsonb(old) end);
 return next_revision;
end;
$$;
revoke all on function public.ridge_manage_timing_assignment(uuid,uuid,uuid,text,text[],timestamptz,boolean,bigint) from public,anon,authenticated;
grant execute on function public.ridge_manage_timing_assignment(uuid,uuid,uuid,text,text[],timestamptz,boolean,bigint) to service_role;
commit;
