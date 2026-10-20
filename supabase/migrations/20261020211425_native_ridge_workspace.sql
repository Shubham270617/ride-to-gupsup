-- Native Ridge workspace. Install ONLY on test project cxwfjrntfqlyaqppxggh.
-- Existing Ridge tables remain untouched; no sample data is copied.
begin;
create table public.ridge_workspace (
  singleton boolean primary key default true check (singleton),
  version bigint not null default 0 check (version >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);
create table public.ridge_publication (
  singleton boolean primary key default true check (singleton),
  version bigint not null default 0,
  feed jsonb not null check (jsonb_typeof(feed) = 'object'),
  updated_at timestamptz not null default now()
);
create table public.ridge_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  version bigint not null unique,
  actor_id uuid not null,
  action text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);
create index ridge_audit_created_idx on public.ridge_audit(created_at desc);
alter table public.ridge_workspace enable row level security;
alter table public.ridge_publication enable row level security;
alter table public.ridge_audit enable row level security;
revoke all on public.ridge_workspace, public.ridge_publication, public.ridge_audit from anon, authenticated;
grant select on public.ridge_workspace, public.ridge_publication, public.ridge_audit to authenticated;
grant all on public.ridge_workspace, public.ridge_publication, public.ridge_audit to service_role;
create policy ridge_workspace_admin_read on public.ridge_workspace for select to authenticated using ((select public.is_admin()));
create policy ridge_audit_admin_read on public.ridge_audit for select to authenticated using ((select public.is_admin()));
create policy ridge_publication_member_read on public.ridge_publication for select to authenticated using (
  (select public.is_admin()) or exists (
    select 1 from public.lab_registrations r where r.user_id = (select auth.uid()) and r.programme_slug = 'ridge-repeats'
  )
);
insert into public.ridge_workspace(state) values ('{"schemaVersion":1,"riders":[],"sessions":[]}');
insert into public.ridge_publication(feed) values ('{"sessions":[],"results":[],"awards":[],"spotlights":[]}');

-- The API verifies the admin's bearer token. This function is service-role only,
-- SECURITY INVOKER, and cannot be called with a member or anonymous token.
create function public.ridge_commit(p_expected bigint, p_request uuid, p_actor uuid, p_state jsonb, p_feed jsonb, p_audit jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  current_version bigint;
  prior public.ridge_audit%rowtype;
begin
  if not exists (select 1 from public.admin_profiles where id = p_actor) then
    raise exception 'Admin seat required' using errcode = '42501';
  end if;
  select version into strict current_version from public.ridge_workspace where singleton for update;
  select * into prior from public.ridge_audit where request_id = p_request;
  if found then
    if prior.actor_id <> p_actor or prior.details->'command' is distinct from p_audit->'command' then
      raise exception 'Request ID already used' using errcode = '23505';
    end if;
    return prior.version;
  end if;
  if current_version <> p_expected then
    raise exception 'Ridge version changed' using errcode = '40001';
  end if;
  if jsonb_typeof(p_state->'riders') is distinct from 'array' or
     jsonb_typeof(p_state->'sessions') is distinct from 'array' or
     p_state->>'schemaVersion' is distinct from '1' or
     jsonb_typeof(p_feed->'results') is distinct from 'array' or
     coalesce(p_audit->>'type', '') = '' then
    raise exception 'Invalid Ridge state' using errcode = '22023';
  end if;
  current_version := current_version + 1;
  update public.ridge_workspace set version = current_version, state = p_state, updated_at = now() where singleton;
  update public.ridge_publication set version = current_version, feed = p_feed, updated_at = now() where singleton;
  insert into public.ridge_audit(request_id, version, actor_id, action, details)
    values (p_request, current_version, p_actor, p_audit->>'type', p_audit);
  return current_version;
end;
$$;
revoke all on function public.ridge_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ridge_commit(bigint,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
