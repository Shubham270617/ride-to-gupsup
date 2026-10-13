-- ============================================================================
-- Migration 017 — Visitor statistics (Admin -> Visitors)
-- ============================================================================
-- Run AFTER 016, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- What it adds:
--   site_sessions     one row per visit to the public site (one browser tab,
--                     from arriving to leaving)
--   site_page_views   one row per page opened during a visit
--   track_site_visit()  the only way a row gets written — the site calls it
--                       when a page opens and every 30 seconds while the tab
--                       stays open
--   site_traffic()      the totals behind the graphs — admins only
--
-- What is stored about a visitor: a random id their browser makes up, the
-- pages they opened, when, and — only if they are logged in — which member
-- they are. No IP address, no location, no device details.
--
-- How a visit is counted in the graphs:
--   Looked and left   not logged in, opened one page, gone within 30 seconds
--   Browsed           not logged in, stayed longer or opened more pages
--   Logged-in member  logged in at some point during the visit
--   Online now        seen in the last 2 minutes
-- ============================================================================

create table if not exists site_sessions (
  id uuid primary key,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_views int not null default 1,
  entry_path text,
  last_path text
);

comment on column site_sessions.visitor_id is 'Random id kept in the visitor''s browser — the same person on the same browser across visits. Not tied to an account.';
comment on column site_sessions.user_id is 'The member, if they were logged in at any point during the visit.';

create index if not exists site_sessions_started_idx on site_sessions (started_at);
create index if not exists site_sessions_last_seen_idx on site_sessions (last_seen_at);

create table if not exists site_page_views (
  id bigint generated always as identity primary key,
  session_id uuid not null references site_sessions(id) on delete cascade,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists site_page_views_viewed_idx on site_page_views (viewed_at);

-- Only admins can read these tables, and nobody writes to them directly:
-- every write goes through track_site_visit() below.
alter table site_sessions enable row level security;
alter table site_page_views enable row level security;

drop policy if exists "site_sessions admin read" on site_sessions;
create policy "site_sessions admin read" on site_sessions for select using (is_admin());

drop policy if exists "site_page_views admin read" on site_page_views;
create policy "site_page_views admin read" on site_page_views for select using (is_admin());

-- Called by the public site (src/lib/useVisitTracker.js): once when a page
-- opens (p_new_page = true) and every 30 seconds while the tab stays open
-- (p_new_page = false). The member is taken from the login itself, never
-- from what the browser sends.
create or replace function track_site_visit(p_session uuid, p_visitor uuid, p_path text, p_new_page boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_path text := left(coalesce(p_path, '/'), 200);
  v_views int;
begin
  if p_session is null or p_visitor is null then
    return;
  end if;

  insert into site_sessions (id, visitor_id, user_id, entry_path, last_path)
  values (p_session, p_visitor, auth.uid(), v_path, v_path)
  on conflict (id) do update
    set last_seen_at = now(),
        user_id = coalesce(auth.uid(), site_sessions.user_id),
        last_path = v_path,
        page_views = site_sessions.page_views + (case when p_new_page then 1 else 0 end)
  returning page_views into v_views;

  -- One visit never records more than 500 pages.
  if p_new_page and v_views <= 500 then
    insert into site_page_views (session_id, path) values (p_session, v_path);
  end if;
end;
$$;

revoke all on function track_site_visit(uuid, uuid, text, boolean) from public;
grant execute on function track_site_visit(uuid, uuid, text, boolean) to anon, authenticated;

-- The totals behind Admin -> Visitors, for the last p_days days (India
-- time). Admins only.
create or replace function site_traffic(p_days int default 30)
returns json
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_from date := v_today - (v_days - 1);
  v_result json;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;

  with visits as (
    select
      s.visitor_id,
      s.user_id,
      (s.started_at at time zone 'Asia/Kolkata')::date as day,
      case
        when s.user_id is not null then 'member'
        when s.page_views <= 1 and s.last_seen_at - s.started_at < interval '30 seconds' then 'left'
        else 'browsed'
      end as kind
    from site_sessions s
    where (s.started_at at time zone 'Asia/Kolkata')::date >= v_from
  ),
  days as (
    select d::date as day from generate_series(v_from, v_today, interval '1 day') as d
  ),
  per_day as (
    select
      d.day,
      count(v.*) filter (where v.kind = 'left') as left_quickly,
      count(v.*) filter (where v.kind = 'browsed') as browsed,
      count(v.*) filter (where v.kind = 'member') as members,
      count(distinct v.visitor_id) as people
    from days d
    left join visits v on v.day = d.day
    group by d.day
  ),
  pages as (
    select p.path, count(*) as views
    from site_page_views p
    where (p.viewed_at at time zone 'Asia/Kolkata')::date >= v_from
    group by p.path
    order by count(*) desc, p.path
    limit 8
  )
  select json_build_object(
    'days', (select coalesce(json_agg(json_build_object('day', day, 'left', left_quickly, 'browsed', browsed, 'members', members, 'people', people) order by day), '[]'::json) from per_day),
    'pages', (select coalesce(json_agg(json_build_object('path', path, 'views', views) order by views desc, path), '[]'::json) from pages),
    'people', (select count(distinct visitor_id) from visits),
    'members', (select count(distinct user_id) from visits where user_id is not null),
    'online', (select count(*) from site_sessions where last_seen_at > now() - interval '2 minutes'),
    'online_members', (select count(*) from site_sessions where last_seen_at > now() - interval '2 minutes' and user_id is not null)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function site_traffic(int) from public;
grant execute on function site_traffic(int) to authenticated;
