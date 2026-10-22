-- INACTIVE proposal. Apply only after TEST activation approval. No existing tables changed.
create schema rtg_personal;
revoke all on schema rtg_personal from public, anon, authenticated;
grant usage on schema rtg_personal to service_role;
create table rtg_personal.connections (
 client_id text not null, user_id uuid not null references auth.users(id) on delete cascade, athlete_id text,
 revision bigint not null default 0, status text not null default 'disconnected'
 check(status in ('disconnected','active','refreshing','reconnect','deleting','deleted','revocation_pending')),
 envelope jsonb, expires_at bigint, authorized_at bigint, activity_revision bigint not null default 0, lease_id uuid, lease_until timestamptz,
 primary key(client_id,user_id)
);
create table rtg_personal.states (
 hash text primary key check(length(hash)=64), client_id text not null, user_id uuid not null references auth.users(id) on delete cascade,
 login_id text not null, expires_at bigint not null, revision bigint not null, started_at bigint not null
);
create table rtg_personal.rule_history (
 client_id text not null,user_id uuid not null references auth.users(id) on delete cascade,rule_id text not null,version bigint not null,
 request_id uuid not null,document jsonb not null,created_at timestamptz not null default now(),
 primary key(client_id,user_id,rule_id,version),unique(client_id,user_id,request_id),
 check(document->>'schemaVersion'='2'),check(document->>'id'=rule_id),check((document->>'version')::bigint=version)
);
alter table rtg_personal.connections enable row level security;
alter table rtg_personal.states enable row level security;
alter table rtg_personal.rule_history enable row level security;
revoke all on all tables in schema rtg_personal from public,anon,authenticated,service_role;
grant select,insert,update,delete on rtg_personal.connections,rtg_personal.states to service_role;
grant select,insert on rtg_personal.rule_history to service_role;
create function public.rtg_personal_store(p_action text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c text:=p_data->>'clientId'; u uuid:=(p_data->>'userId')::uuid;
 r rtg_personal.connections%rowtype; s rtg_personal.states%rowtype; h rtg_personal.rule_history%rowtype;
 n bigint; ms bigint:=floor(extract(epoch from clock_timestamp())*1000);
begin
 if c !~ '^[0-9]+$' or u is null then raise exception 'Invalid binding'; end if;
 perform pg_advisory_xact_lock(hashtextextended(c||u::text,0));
 insert into rtg_personal.connections(client_id,user_id) values(c,u) on conflict do nothing;
 select * into r from rtg_personal.connections where client_id=c and user_id=u for update;
 if p_action='state.put' then
  delete from rtg_personal.states where expires_at<ms;
  if (p_data->>'expiresAt')::bigint>ms+600000 or (p_data->>'expiresAt')::bigint<=ms or coalesce(p_data->>'loginId','')='' then raise exception 'Invalid state'; end if;
  insert into rtg_personal.states values(p_data->>'hash',c,u,p_data->>'loginId',(p_data->>'expiresAt')::bigint,r.revision,ms);
  return 'true';
 elsif p_action='state.consume' then
  delete from rtg_personal.states where hash=p_data->>'hash' and client_id=c and user_id=u and login_id=p_data->>'loginId' and expires_at>=ms returning * into s;
  if not found then return 'null'; end if;
  return jsonb_build_object('revision',s.revision,'startedAt',s.started_at);
 elsif p_action='connect' then
  if r.revision is distinct from (p_data->>'expectedRevision')::bigint or r.lease_until>clock_timestamp() or r.status in ('deleting','revocation_pending') then raise exception 'Connection changed'; end if;
  if (p_data->>'authorizationStartedAt')::bigint is null or (p_data->>'authorizationStartedAt')::bigint>ms or (p_data->>'authorizationStartedAt')::bigint<0 then raise exception 'Authorization start required'; end if;
  if coalesce(p_data->>'athleteId','') !~ '^[0-9]+$' or jsonb_typeof(p_data->'envelope')<>'object' then raise exception 'Invalid connection'; end if;
  update rtg_personal.connections set athlete_id=p_data->>'athleteId',revision=revision+1,status='active',authorized_at=(p_data->>'authorizationStartedAt')::bigint,envelope=p_data->'envelope',expires_at=(p_data->>'expiresAt')::bigint,lease_id=null,lease_until=null where client_id=c and user_id=u;
  return 'true';
 elsif p_action='read' then return to_jsonb(r);
 elsif p_action='invalidate' then
  update rtg_personal.connections set activity_revision=activity_revision+1 where client_id=c and user_id=u;
  return 'true';
 elsif p_action in ('erase','deauthorize','delete.complete') then
  if p_action='deauthorize' and (p_data->>'eventTime')::bigint<coalesce(r.authorized_at,0) then return 'false'; end if;
  if p_action='delete.complete' and (r.lease_id is null or r.lease_id is distinct from (p_data->>'leaseId')::uuid or r.lease_until<=clock_timestamp() or r.revision is distinct from (p_data->>'revision')::bigint or r.status<>'deleting') then raise exception 'Deletion lease lost'; end if;
  -- A tombstone fences callback/refresh completions, including other instances.
  update rtg_personal.connections set revision=revision+1,status=case when p_action='delete.complete' and not coalesce((p_data->>'remoteRevocationConfirmed')::boolean,false) then 'revocation_pending' else 'deleted' end,envelope=null,expires_at=null,lease_id=null,lease_until=null where client_id=c and user_id=u;
  delete from rtg_personal.states where client_id=c and user_id=u;
  return 'true';
 elsif p_action='lease' then
  if r.lease_until>clock_timestamp() then raise exception 'Connection busy'; end if;
  if r.status='refreshing' then
   update rtg_personal.connections set status='reconnect' where client_id=c and user_id=u;
  end if;
  update rtg_personal.connections set lease_id=(p_data->>'leaseId')::uuid,lease_until=clock_timestamp()+interval '45 seconds' where client_id=c and user_id=u;
  return 'true';
 elsif p_action='release' then
  update rtg_personal.connections set lease_id=null,lease_until=null where client_id=c and user_id=u and lease_id=(p_data->>'leaseId')::uuid;
  return 'true';
 elsif p_action in ('status','tokens','reconnect') then
  if r.lease_id is distinct from (p_data->>'leaseId')::uuid or r.lease_until<=clock_timestamp() or r.lease_id is null then raise exception 'Lease lost'; end if;
  if p_action='reconnect' then
   update rtg_personal.connections set status='reconnect' where client_id=c and user_id=u;
  else
   if r.revision is distinct from (p_data->>'revision')::bigint then raise exception 'Connection changed'; end if;
   if p_action='status' then
    if p_data->>'status' not in ('refreshing','deleting') then raise exception 'Invalid transition'; end if;
    update rtg_personal.connections set status=p_data->>'status' where client_id=c and user_id=u;
   else
    if r.status<>'refreshing' then raise exception 'Refresh not started'; end if;
    update rtg_personal.connections set revision=revision+1,status='active',envelope=p_data->'envelope',expires_at=(p_data->>'expiresAt')::bigint where client_id=c and user_id=u;
   end if;
  end if;
  return 'true';
 elsif p_action='rules.list' then
  return coalesce((select jsonb_agg(document order by version) from rtg_personal.rule_history where client_id=c and user_id=u and rule_id=p_data->>'ruleId'),'[]');
 elsif p_action='rules.append' then
  select * into h from rtg_personal.rule_history where client_id=c and user_id=u and request_id=(p_data->>'requestId')::uuid;
  if found then
   if h.document is distinct from p_data->'document' then raise exception 'Request ID reused'; end if;
   return h.document;
  end if;
  select coalesce(max(version),0) into n from rtg_personal.rule_history where client_id=c and user_id=u and rule_id=p_data->'document'->>'id';
  if n is distinct from (p_data->>'expectedVersion')::bigint or (p_data->'document'->>'version')::bigint is distinct from n+1 then raise exception 'Rule version conflict' using errcode='P4091'; end if;
  insert into rtg_personal.rule_history(client_id,user_id,rule_id,version,request_id,document) values(c,u,p_data->'document'->>'id',n+1,(p_data->>'requestId')::uuid,p_data->'document');
  return p_data->'document';
 end if;
 raise exception 'Unsupported operation';
end $$;
revoke all on function public.rtg_personal_store(text,jsonb) from public,anon,authenticated;
grant execute on function public.rtg_personal_store(text,jsonb) to service_role;
-- Narrow server-only login revocation check; never exposes session rows.
create function public.rtg_personal_session_alive(p_user uuid,p_session uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
 where s.id=p_session and s.user_id=p_user and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.rtg_personal_session_alive(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rtg_personal_session_alive(uuid,uuid) to service_role;
