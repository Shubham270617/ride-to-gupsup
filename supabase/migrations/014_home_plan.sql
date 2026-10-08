-- ============================================================================
-- Migration 014 — Homepage refinement plan: community membership, the
-- Adventure calendar type, and the "Ways to Move" card links
-- ============================================================================
-- Run AFTER 013, in the Supabase SQL Editor. Safe to re-run.
--
-- 1. profiles.community_joined / community_joined_at — "Community Status =
--    Joined", stored on the member's profile. It is set when a member
--    submits the Community Registration form (/onboarding). A "Join
--    Community" button (Home hero, Community page) then:
--      not logged in            -> asks them to log in or sign up first
--      logged in, not joined    -> opens that form
--      already joined           -> shows a "you're already part of RTG" window
--    Everyone who had already completed the form is marked as joined.
--
-- 2. An "Adventure" activity type on the Calendar, so Home's Adventure card
--    has a filter to open (Admin -> Calendar — Activity Types).
--
-- 3. Home's "Ways to Move" cards now open the Calendar with their own
--    filter on (Admin -> Home — Ways to Move Cards -> Link).
--
-- What this removes: the saved Home hero "button link" setting — that
-- button now starts the Join Community flow instead of following a link.
-- ============================================================================

-- 1. Community membership ----------------------------------------------------

alter table profiles add column if not exists community_joined boolean not null default false;
alter table profiles add column if not exists community_joined_at timestamptz;

comment on column profiles.community_joined is 'True once the member has submitted the Community Registration form.';

update profiles
set community_joined = true,
    community_joined_at = coalesce(community_joined_at, created_at)
where onboarding_complete = true and community_joined = false;

-- 2. Adventure activity type — only if there isn't one yet.

insert into calendar_categories (slug, name, detail_label, color, sort_order)
select 'adventure', 'Adventure', 'Adventure Experience', '#2f9e6b',
       coalesce((select max(sort_order) from calendar_categories), 0) + 1
where not exists (select 1 from calendar_categories where slug = 'adventure');

-- 3. "Ways to Move" cards -> the Calendar, filtered. Only cards still
--    pointing at their original pages are changed, so a link an admin has
--    already set by hand is left alone.

update home_ways set link_url = '/calendar?category=running'
where lower(trim(title)) = 'running' and link_url in ('/weekly-rides', '/events', '/calendar');

update home_ways set link_url = '/calendar?category=cycling'
where lower(trim(title)) = 'cycling' and link_url in ('/weekly-rides', '/events', '/calendar');

update home_ways set link_url = '/calendar?category=adventure'
where lower(trim(title)) = 'adventure' and link_url in ('/weekly-rides', '/events', '/calendar');

-- 4. Remove what is no longer used. THIS DELETES one saved setting: the
--    Home hero button's link.

delete from site_settings where key = 'text.home.hero.ctaLink';
