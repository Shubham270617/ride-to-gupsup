-- STATUS UPDATE: approved variant applied to TEST cxwfjrntfqlyaqppxggh on 21 Oct 2026.
-- See docs/launch-audit/approved-test-storage-bundle.sql and test-storage-application.md.
-- Do not rerun this original proposal; layout endpoint activation remains pending.
-- REVIEW-ONLY / NOT EXECUTED. Apply only to the verified existing TEST database
-- after explicit approval of schema/security changes. Do not run on production.
-- Requires existing public.is_admin() and normal Supabase roles. No applications,
-- payments, personal contacts or named programme leads are collected here.
-- BLOCKER: review/contain bootstrap admin-seat self-enrolment and verify actual
-- admin identities before trusting is_admin() or activating these permissions.
begin;

create table public.volunteer_role_drafts (
  id text primary key check (length(id) <= 80 and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 120),
  team text not null check (team in ('Logistics','Media','Coaching')),
  location text not null default '' check (length(location) <= 200),
  plans text[] not null check (cardinality(plans) between 1 and 4 and plans <@ array['One day','Weekly','Monthly','Internship']::text[] and array_position(plans,null) is null),
  intro text not null check (length(btrim(intro)) between 1 and 1500),
  tasks text[] not null default '{}' check (cardinality(tasks) <= 20 and array_position(tasks,null) is null and length(array_to_string(tasks,'')) <= 5000),
  fit text not null default '' check (length(fit) <= 1500),
  deliverable text not null default '' check (length(deliverable) <= 1500),
  ridge boolean not null default false,
  sort_order integer not null default 0,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

-- Public records are a separate approved snapshot: saving a draft never alters
-- what visitors see. No automatic seed/publication is included in this plan.
create table public.volunteer_roles (like public.volunteer_role_drafts including all);

create function public.bump_volunteer_role_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.version := old.version + 1;
  else new.version := 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.bump_volunteer_role_version() from public;
create trigger volunteer_draft_version before insert or update on public.volunteer_role_drafts
for each row execute function public.bump_volunteer_role_version();
create trigger volunteer_public_version before insert or update on public.volunteer_roles
for each row execute function public.bump_volunteer_role_version();

alter table public.volunteer_role_drafts enable row level security;
alter table public.volunteer_roles enable row level security;
revoke all on public.volunteer_role_drafts from public, anon, authenticated;
revoke all on public.volunteer_roles from public, anon, authenticated;
grant select, insert, update, delete on public.volunteer_role_drafts to authenticated;
grant select on public.volunteer_roles to anon, authenticated;
grant insert, update, delete on public.volunteer_roles to authenticated;

create policy volunteer_drafts_admin_only on public.volunteer_role_drafts
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy volunteer_approved_read on public.volunteer_roles
for select to anon, authenticated using (true);
create policy volunteer_approved_admin_write on public.volunteer_roles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- No RPC that opens recruitment or writes applications exists. Public approval
-- is a distinct admin action and must be added to the UI only after review.
commit;
