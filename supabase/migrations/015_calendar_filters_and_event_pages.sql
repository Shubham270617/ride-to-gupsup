-- ============================================================================
-- Migration 015 — Calendar filters (an activity under more than one filter)
-- and the three event sub-pages
-- ============================================================================
-- Run AFTER 014, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- 1. calendar_categories.show_as_filter — whether an activity type gets its
--    own filter pill above the calendar. Brick and Community are switched
--    off, so the pills read: All | Cycling | Running | Adventure. Both types
--    stay as they are otherwise (their colour, their legend pill, their
--    activities). Admin -> Calendar — Activity Types -> "Show as a filter".
--
-- 2. calendar_activities.also_category_slugs — the other filters an activity
--    also appears under, besides its own type. Brick & Burn is put under
--    Cycling + Running, MTB activities under Cycling + Adventure.
--    Admin -> Calendar — Activities -> "Also show under these filters".
--    A new activity type added later is simply one more filter — nothing
--    here needs changing.
--
-- 3. The three event sub-pages:
--      /events/ridge-repeats      (already an event)
--      /events/brick-and-burn     (already an event)
--      /events/strava-challenge   (added here, if it isn't there yet)
--    Each is a row of the `events` table (Admin -> Events), so it is on the
--    Events page automatically and its wording is editable.
--
-- 4. Home's "Training Formats" buttons (Ridge Repeats, Brick & Burn) now
--    open their event page (Admin -> Home — Training Formats -> Button Link).
-- ============================================================================

-- 1 + 2. Calendar filters. The starting values are set only the first time
--        (when the column is created), so re-running this file never undoes
--        a choice made in the admin since.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_categories' and column_name = 'show_as_filter'
  ) then
    alter table calendar_categories add column show_as_filter boolean not null default true;

    update calendar_categories set show_as_filter = false where slug in ('brick', 'community');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_activities' and column_name = 'also_category_slugs'
  ) then
    alter table calendar_activities add column also_category_slugs text[] not null default '{}';

    -- Brick & Burn -> Cycling + Running
    update calendar_activities
    set also_category_slugs = array(select slug from calendar_categories where slug in ('cycling', 'running') order by sort_order)
    where category_slug = 'brick' or title ilike '%brick%';

    -- MTB activities -> Cycling + Adventure (whichever of the two isn't
    -- already the activity's own type)
    update calendar_activities a
    set also_category_slugs = array(
      select slug from calendar_categories
      where slug in ('cycling', 'adventure') and slug is distinct from a.category_slug
      order by sort_order
    )
    where a.title ilike '%mtb%';
  end if;
end $$;

comment on column calendar_categories.show_as_filter is 'Whether this activity type has its own filter pill above the calendar.';
comment on column calendar_activities.also_category_slugs is 'Short codes of the other activity types whose filter this activity also appears under.';

-- 3. The Strava Challenge event page — only if there isn't one yet.

insert into events
  (slug, title, event_date, event_type, event_status, tone, description, home_pills, cover_image_url, featured, sort_order)
select 'strava-challenge', 'RTG Strava Challenge', 'Coming Soon', 'Virtual Challenge', 'Virtual', 'electric',
       'Ride or run from anywhere, record it on Strava and move up the RTG board with the rest of the community.',
       'Pan-India, Ride + Run, Tracked on Strava',
       '/images/rtg-reference/rtg-community.jpg', false,
       coalesce((select max(sort_order) from events), 0) + 1
where not exists (select 1 from events where slug = 'strava-challenge');

-- 4. Home's Training Formats buttons -> their event pages. Only buttons
--    still pointing at the original page are changed, so a link an admin
--    has already set by hand is left alone.

update home_training_formats set link_url = '/events/ridge-repeats'
where tab_label ilike '%ridge%' and link_url = '/weekly-rides'
  and exists (select 1 from events where slug = 'ridge-repeats');

update home_training_formats set link_url = '/events/brick-and-burn'
where tab_label ilike '%brick%' and link_url = '/weekly-rides'
  and exists (select 1 from events where slug = 'brick-and-burn');
