-- ============================================================================
-- Migration 028 — RTG Crew (volunteer) roles
-- ============================================================================
-- Run AFTER 027, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Tables behind Admin -> Volunteer roles and the public /volunteer (RTG Crew)
-- page from Randeep's branch. Until now they existed only in his TEST
-- project (docs/volunteer-role-schema-plan.sql); this is that plan as a
-- normal migration.
--
-- * volunteer_role_drafts — admins' private working copies.
-- * volunteer_roles       — what visitors see. Saving a draft never changes
--                           it; nothing is published automatically.
-- No applications, payments or personal details are collected.
--
-- The page itself stays hidden until an admin turns on "Show the RTG Crew
-- page" in Admin -> Volunteer roles (site setting feature.volunteer.enabled).
-- ============================================================================

create table if not exists public.volunteer_role_drafts (
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

create table if not exists public.volunteer_roles (like public.volunteer_role_drafts including all);

-- Every save bumps the version, so two admins editing the same role can't
-- silently overwrite each other (the admin page checks it).
create or replace function public.bump_volunteer_role_version()
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

drop trigger if exists volunteer_draft_version on public.volunteer_role_drafts;
create trigger volunteer_draft_version before insert or update on public.volunteer_role_drafts
for each row execute function public.bump_volunteer_role_version();
drop trigger if exists volunteer_public_version on public.volunteer_roles;
create trigger volunteer_public_version before insert or update on public.volunteer_roles
for each row execute function public.bump_volunteer_role_version();

alter table public.volunteer_role_drafts enable row level security;
alter table public.volunteer_roles enable row level security;
revoke all on public.volunteer_role_drafts from public, anon, authenticated;
revoke all on public.volunteer_roles from public, anon, authenticated;
grant select, insert, update, delete on public.volunteer_role_drafts to authenticated;
grant select on public.volunteer_roles to anon, authenticated;
grant insert, update, delete on public.volunteer_roles to authenticated;

drop policy if exists volunteer_drafts_admin_only on public.volunteer_role_drafts;
create policy volunteer_drafts_admin_only on public.volunteer_role_drafts
for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists volunteer_approved_read on public.volunteer_roles;
create policy volunteer_approved_read on public.volunteer_roles
for select to anon, authenticated using (true);
drop policy if exists volunteer_approved_admin_write on public.volunteer_roles;
create policy volunteer_approved_admin_write on public.volunteer_roles
for all to authenticated using (public.is_admin()) with check (public.is_admin());
