-- ============================================================================
-- Migration 026 — "Online now" counts people, not browser tabs
-- ============================================================================
-- Run AFTER 025, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Admin -> Dashboard / Visitors showed "Online now" as the number of open
-- browser TABS seen in the last 2 minutes, so one member with the site open
-- in four tabs showed as "4 logged in" while the chat (which counts people)
-- showed nobody else online. Now a logged-in member counts once however many
-- tabs or devices they use, and a guest counts once per browser.
-- Only site_traffic() changes.
-- ============================================================================

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
    -- People, not tabs: a member with the site open in four tabs (or on a
    -- phone and a laptop) is one person online; a guest is one browser.
    'online', (select count(distinct coalesce(user_id::text, 'v:' || visitor_id::text)) from site_sessions where last_seen_at > now() - interval '2 minutes'),
    'online_members', (select count(distinct user_id) from site_sessions where last_seen_at > now() - interval '2 minutes' and user_id is not null)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function site_traffic(int) from public;
grant execute on function site_traffic(int) to authenticated;
