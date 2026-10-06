-- ============================================================================
-- Migration 010 — Calendar page: its own two tables
-- ============================================================================
-- Run AFTER 009, in the Supabase SQL Editor. Safe to re-run.
--
-- The Calendar page (/calendar) is now drawn entirely from two new tables,
-- each with its own admin screen:
--
-- 1. calendar_categories — the activity types (Brick, Cycling, Running …).
--    Each one is a filter pill above the calendar, a legend pill, a floating
--    tag in the hero, and the colour of every activity filed under it.
--    Admin -> Calendar — Activity Types.
--
-- 2. calendar_activities — everything that appears on the calendar. One row
--    is either:
--      'weekly'   — repeats on one weekday, every week (Friday bricks);
--      'once'     — happens on one exact date (a race, a one-off ride);
--      'flexible' — no fixed day yet; listed in the "Weekly Rhythm" panel
--                   only, not on the day grid.
--    Admin -> Calendar — Activities.
--
-- The page's headings, labels and paragraphs live in site_settings under
-- "text.calendar.<field>" (Admin -> Site Content -> Calendar).
--
-- What this REPLACES — and removes:
--   * the calendar_events table (Admin -> Race Calendar) ............ DROPPED
--   * the events.calendar_date column (Admin -> Events) ............. DROPPED
--   * the 'calendarHero' site photo (the page no longer has one) .... DELETED
-- Before anything is dropped, every existing calendar_events row, every
-- event that had a Calendar Date, and every weekly session is COPIED into
-- calendar_activities (step 3), so nothing already on the calendar is lost.
-- Weekly sessions themselves are not touched — the weekly_sessions table
-- still drives the Weekly Rides page.
-- ============================================================================

-- 1. Tables ------------------------------------------------------------------

create table if not exists calendar_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  detail_label text,
  color text not null default '#35246f',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column calendar_categories.name is 'Short name — the filter pill, legend pill and hero tag (e.g. Brick).';
comment on column calendar_categories.detail_label is 'Longer name at the top of an activity''s detail window (e.g. Brick Session). Optional — falls back to name.';
comment on column calendar_categories.color is 'Hex colour (#rrggbb) of this type''s activities everywhere on the Calendar page.';

create table if not exists calendar_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_slug text references calendar_categories(slug) on update cascade on delete set null,
  schedule_type text not null default 'weekly' check (schedule_type in ('weekly', 'once', 'flexible')),
  weekday text check (weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  activity_date date,
  when_text text,
  time_text text,
  city text,
  location text,
  format text,
  summary text,
  organiser text,
  status_label text,
  note text,
  link_label text,
  link_url text,
  show_in_rhythm boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column calendar_activities.schedule_type is 'weekly = repeats on `weekday`; once = happens on `activity_date`; flexible = no fixed day (Weekly Rhythm panel only).';
comment on column calendar_activities.when_text is 'Flexible activities only: the words shown instead of a day, e.g. Weekend.';
comment on column calendar_activities.show_in_rhythm is 'Also list this activity in the "Weekly Rhythm" panel above the calendar.';

create index if not exists calendar_activities_date_idx on calendar_activities (activity_date) where activity_date is not null;

-- 2. Row level security — public can read published rows, admins write.

do $$
declare
  t text;
begin
  foreach t in array array['calendar_categories', 'calendar_activities']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%s public read" on %I', t, t);
    execute format('create policy "%s public read" on %I for select using (published = true or is_admin())', t, t);
    execute format('drop policy if exists "%s admin insert" on %I', t, t);
    execute format('create policy "%s admin insert" on %I for insert with check (is_admin())', t, t);
    execute format('drop policy if exists "%s admin update" on %I', t, t);
    execute format('create policy "%s admin update" on %I for update using (is_admin())', t, t);
    execute format('drop policy if exists "%s admin delete" on %I', t, t);
    execute format('create policy "%s admin delete" on %I for delete using (is_admin())', t, t);
  end loop;
end $$;

-- 3. Starter activity types — ONLY if there are none yet.

insert into calendar_categories (slug, name, detail_label, color, sort_order)
select * from (values
  ('brick', 'Brick', 'Brick Session', '#d75b25', 1),
  ('cycling', 'Cycling', 'Cycling Session', '#4c338c', 2),
  ('running', 'Running', 'Running Session', '#c2484d', 3),
  ('community', 'Community', 'Community Event', '#1f9aa6', 4)
) as starter
where not exists (select 1 from calendar_categories);

-- 4. Carry the old calendar over, then remove it. The copy only runs while
--    calendar_activities is still empty, so re-running never duplicates.
--    Each copied row is filed under a best-guess activity type — check them
--    in Admin -> Calendar — Activities afterwards.

do $$
begin
  if not exists (select 1 from calendar_activities) then

    -- Weekly sessions -> one 'weekly' activity each, linked to its own page.
    insert into calendar_activities
      (title, category_slug, schedule_type, weekday, time_text, location, format, summary,
       link_label, link_url, show_in_rhythm, sort_order, published)
    select
      s.name,
      (select c.slug from calendar_categories c where c.slug =
        case
          when (s.name || ' ' || coalesce(s.format, '')) ilike '%brick%' then 'brick'
          when (s.name || ' ' || coalesce(s.format, '')) ilike '%run%'
               and (s.name || ' ' || coalesce(s.format, '')) not ilike '%rid%'
               and (s.name || ' ' || coalesce(s.format, '')) not ilike '%cycl%' then 'running'
          else 'cycling'
        end),
      'weekly', s.day, s.time, s.location, s.format, s.description,
      case when s.slug is not null then 'View Session' end,
      case when s.slug is not null then '/weekly-rides/' || s.slug end,
      true, s.sort_order, s.published
    from weekly_sessions s
    where s.day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

    -- Old Race Calendar entries -> one 'once' activity each.
    if to_regclass('public.calendar_events') is not null then
      execute $copy$
        insert into calendar_activities
          (title, category_slug, schedule_type, activity_date, city, summary,
           link_label, link_url, sort_order, published)
        select
          e.title,
          (select c.slug from calendar_categories c where c.slug =
            case lower(coalesce(e.category, ''))
              when 'running' then 'running'
              when 'triathlon' then 'brick'
              when 'community' then 'community'
              when 'adventure' then 'community'
              else 'cycling'
            end),
          'once', e.event_date, e.city,
          case when e.difficulty is not null then 'Difficulty: ' || e.difficulty end,
          case when e.event_slug is not null then 'View Event' end,
          case when e.event_slug is not null then '/events/' || e.event_slug end,
          e.sort_order, e.published
        from calendar_events e
      $copy$;
    end if;

    -- Events that had a Calendar Date -> one 'once' activity each, linked to
    -- the event's page.
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'events' and column_name = 'calendar_date'
    ) then
      execute $copy$
        insert into calendar_activities
          (title, category_slug, schedule_type, activity_date, format, summary,
           link_label, link_url, sort_order, published)
        select
          e.title,
          (select c.slug from calendar_categories c where c.slug =
            case when array_to_string(e.categories, ' ') ilike '%run%' then 'running' else 'cycling' end),
          'once', e.calendar_date, e.event_type, e.description,
          'View Event', '/events/' || e.slug,
          e.sort_order, e.published
        from events e
        where e.calendar_date is not null
      $copy$;
    end if;

  end if;
end $$;

-- 5. Starter activities — ONLY if the calendar is still empty after step 4
--    (a new install with no weekly sessions yet), so the page isn't blank.

insert into calendar_activities
  (title, category_slug, schedule_type, weekday, when_text, city, location, format, summary, status_label, show_in_rhythm, sort_order)
select
  starter.title,
  (select c.slug from calendar_categories c where c.slug = starter.category_slug),
  starter.schedule_type, starter.weekday, starter.when_text, starter.city, starter.location,
  starter.format, starter.summary, starter.status_label, true, starter.sort_order
from (values
  ('RTG Brick & Burn', 'brick', 'weekly', 'Friday', null, 'Delhi NCR', 'Nehru Park', 'Ride + Run + Mobility',
   'A recurring combined cycling and running session designed around multi-sport consistency and mobility.',
   'Recurring Community Session', 1),
  ('RTG Ridge Repeats', 'cycling', 'weekly', 'Saturday', null, 'Delhi NCR', 'Talkatora Stadium', '5 × 9.15 km loops',
   'A repeat-loop endurance session built around pacing, climbing, consistency and improvement against your own previous loop.',
   'Recurring Community Session', 2),
  ('Community Experiences', 'community', 'flexible', null, 'Weekend', 'Multi-Community', null, null,
   'Long rides, trail mornings, MTB and other group-led experiences.',
   'More Soon', 3)
) as starter (title, category_slug, schedule_type, weekday, when_text, city, location, format, summary, status_label, sort_order)
where not exists (select 1 from calendar_activities);

-- 6. Remove what the new calendar replaces. THIS DELETES DATA: the old
--    Race Calendar table and the events' Calendar Date column (both copied
--    into calendar_activities in step 4), and the Calendar page's old hero
--    photo setting.

drop table if exists calendar_events;

drop index if exists events_calendar_date_idx;
alter table events drop column if exists calendar_date;

delete from site_images where key = 'calendarHero';

-- 7. The page moved from /race-calendar to /calendar (the old address still
--    redirects). Point any footer link at the new one.

update footer_links set link_url = '/calendar' where link_url = '/race-calendar';
