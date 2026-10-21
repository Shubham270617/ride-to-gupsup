-- INACTIVE REVIEW CANDIDATE. Do not apply without explicit activation approval.
begin;
create table public.ridge_timing_codes(id uuid primary key default gen_random_uuid(),code_hash text unique not null check(length(code_hash)=64),issuer_id uuid not null,scope text not null check(scope in ('timing','advanced')),user_id uuid,session_id text,assignment_revision bigint,expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now(),check(scope='advanced' or (user_id is not null and session_id is not null)));
create table public.ridge_timing_code_sessions(session_hash text primary key check(length(session_hash)=64),code_id uuid not null references public.ridge_timing_codes(id),expires_at timestamptz not null,created_at timestamptz not null default now());
create table public.ridge_timing_code_rates(key text primary key,started_at timestamptz not null,attempts integer not null);
create table public.ridge_timing_code_audit(id bigint generated always as identity primary key,code_id uuid,actor_id uuid,action text not null,created_at timestamptz not null default now());
alter table public.ridge_timing_codes enable row level security;
alter table public.ridge_timing_code_sessions enable row level security;
alter table public.ridge_timing_code_rates enable row level security;
alter table public.ridge_timing_code_audit enable row level security;
revoke all on public.ridge_timing_codes,public.ridge_timing_code_sessions,public.ridge_timing_code_rates,public.ridge_timing_code_audit from public,anon,authenticated;
grant select,insert,update,delete on public.ridge_timing_codes,public.ridge_timing_code_sessions,public.ridge_timing_code_rates to service_role;
revoke all on public.ridge_timing_code_audit from service_role;
grant select,insert on public.ridge_timing_code_audit to service_role;
grant usage,select on sequence public.ridge_timing_code_audit_id_seq to service_role;
create function public.ridge_code_access(p_action text,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.ridge_timing_codes%rowtype; a public.ridge_timing_assignments%rowtype; s public.ridge_timing_code_sessions%rowtype; k text; n integer; permitted boolean:=true; expiry timestamptz; actor uuid; result jsonb;
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
  if p_data->>'scope'='timing' then
   select * into a from public.ridge_timing_assignments where user_id=(p_data->>'userId')::uuid and session_id=p_data->>'sessionId' for share;
   if not found or a.revoked_at is not null or a.expires_at<=clock_timestamp() then raise exception 'Active assignment required' using errcode='42501';end if;
   expiry:=least(expiry,a.expires_at);
  elsif p_data->>'scope'<>'advanced' then raise exception 'Invalid scope';end if;
  insert into public.ridge_timing_codes(code_hash,issuer_id,scope,user_id,session_id,assignment_revision,expires_at) values(p_data->>'codeHash',actor,p_data->>'scope',a.user_id,a.session_id,a.revision,expiry) returning * into c;
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
 if c.scope='timing' then
  select * into a from public.ridge_timing_assignments where user_id=c.user_id and session_id=c.session_id for share;
  if not found or a.revoked_at is not null or a.expires_at<=clock_timestamp() or a.revision<>c.assignment_revision then return null;end if;
 end if;
 expiry:=least(c.expires_at,clock_timestamp()+interval '20 minutes');
 if p_action='exchange' then
  delete from public.ridge_timing_code_sessions where expires_at<clock_timestamp();
  insert into public.ridge_timing_code_sessions values(p_data->>'sessionHash',c.id,expiry,clock_timestamp());
  insert into public.ridge_timing_code_audit(code_id,actor_id,action) values(c.id,c.user_id,'exchange');
 else expiry:=s.expires_at;end if;
 result:=jsonb_build_object('credentialId',c.id,'scope',c.scope,'issuerId',c.issuer_id,'userId',c.user_id,'sessionId',c.session_id,'rosterIds',to_jsonb(a.roster_rider_ids),'expiresAt',extract(epoch from expiry)*1000);
 return result;
end $$;
create function public.ridge_code_commit(p_session_hash text,p_credential uuid,p_expected bigint,p_request uuid,p_command jsonb,p_state jsonb,p_feed jsonb,p_audit jsonb) returns bigint language plpgsql security invoker set search_path='' as $$
declare access jsonb; v bigint; prior public.ridge_audit%rowtype;
begin
 -- Same transaction keeps credential/assignment share locks until native commit.
 perform 1 from public.ridge_workspace where singleton for update;
 access:=public.ridge_code_access('read',jsonb_build_object('sessionHash',p_session_hash));
 if access is null then raise exception 'Code expired or revoked' using errcode='42501';end if;
 if (access->>'credentialId')::uuid is distinct from p_credential then raise exception 'Code changed' using errcode='42501';end if;
 select * into prior from public.ridge_audit where request_id=p_request;
 if found and prior.details->>'credentialId' is distinct from p_credential::text then raise exception 'Receipt belongs to another credential' using errcode='42501';end if;
 if access->>'scope'='timing' then
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
revoke all on function public.ridge_code_access(text,jsonb),public.ridge_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ridge_code_access(text,jsonb),public.ridge_code_commit(text,uuid,bigint,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
