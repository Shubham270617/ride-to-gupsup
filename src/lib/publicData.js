import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  events as staticEvents,
  products as staticProducts,
  blogPosts as staticBlogPosts,
  challenges as staticChallenges,
  testimonials as staticTestimonials,
  teamMembers as staticTeamMembers,
  raceResults as staticRaceResults,
  calendarEvents as staticCalendarEvents,
  weeklySessions as staticWeeklySessions,
} from "../data/content";
import { images as staticImages } from "../data/images";

/**
 * Fetches a published-content table from Supabase and swaps it in once
 * loaded. Starts from the static content.js/images.js values so pages never
 * show a blank/loading state — if Supabase is unreachable or a table is
 * still empty, the static fallback just stays on screen.
 */
function useSupabaseList(table, { staticFallback, mapRow, orderBy = "sort_order", ascending = true, filterPublished = true }) {
  const [items, setItems] = useState(staticFallback);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let query = supabase.from(table).select("*");
    if (filterPublished) query = query.eq("published", true);
    query = query.order(orderBy, { ascending });

    let cancelled = false;
    query.then(({ data, error }) => {
      if (cancelled || error || !data || data.length === 0) return;
      setItems(data.map(mapRow));
    });
    return () => {
      cancelled = true;
    };
  }, [table]);

  return items;
}

const mapEventRow = (r) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  date: r.event_date,
  type: r.event_type,
  categories: r.categories || [],
  prize: r.prize_pool,
  desc: r.description,
  image: r.cover_image_url,
  featured: r.featured,
  route: r.route_info,
  routeMapQuery: r.route_map_query,
  elevation: r.elevation_gain,
  gpxUrl: r.gpx_url,
  results: r.results_summary,
  previousEdition: r.previous_edition_summary,
});

export function useEvents() {
  return useSupabaseList("events", { staticFallback: staticEvents, mapRow: mapEventRow });
}

// Used only for the "Upcoming Event" teaser in the login popup — unlike
// useEvents(), this never falls back to placeholder content, so the teaser
// simply doesn't render until a real event exists in the database.
export function useUpcomingEvent() {
  const events = useSupabaseList("events", { staticFallback: [], mapRow: mapEventRow });
  return events.find((e) => e.featured) || events[0] || null;
}

/** Find one event by slug/id — used by the event detail page. Falls back to
 * scanning the same list useEvents() already resolves (DB or static). */
export function useEvent(slugOrId) {
  const events = useEvents();
  return events.find((e) => e.slug === slugOrId || e.id === slugOrId);
}

export function useProducts() {
  return useSupabaseList("products", {
    staticFallback: staticProducts,
    filterPublished: false,
    mapRow: (r) => ({ id: r.id, name: r.name, price: Number(r.price), tag: r.tag, image: r.image_url }),
  });
}

export function useBlogPosts() {
  return useSupabaseList("blog_posts", {
    staticFallback: staticBlogPosts,
    orderBy: "published_at",
    mapRow: (r) => ({ id: r.id, title: r.title, category: r.category, excerpt: r.excerpt, image: r.cover_image_url }),
  });
}

export function useChallenges() {
  return useSupabaseList("challenges", {
    staticFallback: staticChallenges,
    filterPublished: false,
    mapRow: (r) => ({ title: r.title, period: r.period, desc: r.description }),
  });
}

// Never falls back to placeholder company names — showing fake "sponsors"
// would misrepresent real partnerships, so this section only renders once
// an admin has added at least one real sponsor.
export function useSponsors() {
  return useSupabaseList("sponsors", {
    staticFallback: [],
    filterPublished: false,
    mapRow: (r) => ({ name: r.name, logo: r.logo_url, tier: r.tier, website: r.website_url }),
  });
}

export function useTestimonials() {
  return useSupabaseList("testimonials", {
    staticFallback: staticTestimonials,
    mapRow: (r) => ({ name: r.name, role: r.role, quote: r.quote, image: r.avatar_url }),
  });
}

const FALLBACK_GALLERY_CATEGORIES = ["Cycling", "Running", "Events", "Cycling", "Events", "Running", "Cycling", "Swimming", "Running", "Events", "Volunteers", "Cycling"];

export function useGalleryItems() {
  const staticFallback = staticImages.gallery.map((url, i) => ({
    url,
    type: "image",
    category: FALLBACK_GALLERY_CATEGORIES[i % FALLBACK_GALLERY_CATEGORIES.length],
  }));
  return useSupabaseList("gallery_items", {
    staticFallback,
    mapRow: (r) => ({ url: r.media_url, type: r.media_type, caption: r.caption, category: r.category }),
  });
}

export function useTeamMembers() {
  const staticFallback = staticTeamMembers.map((t) => ({ ...t, image: staticImages[t.avatarKey] }));
  return useSupabaseList("team_members", {
    staticFallback,
    mapRow: (r) => ({ name: r.name, role: r.role, city: r.city, sport: r.sport, instagramUrl: r.instagram_url, image: r.avatar_url }),
  });
}

export function useRaceResults() {
  const staticFallback = staticRaceResults;
  return useSupabaseList("race_results", {
    staticFallback,
    orderBy: "year",
    ascending: false,
    filterPublished: false,
    mapRow: (r) => ({
      eventName: r.event_name,
      athleteName: r.athlete_name,
      category: r.category,
      finishTime: r.finish_time,
      position: r.position,
      year: r.year,
      certificateUrl: r.certificate_url,
    }),
  });
}

// Real, admin-manageable race calendar — replaces the old hardcoded list so
// the "Register" button can deep-link to a real event page when the admin
// has linked one, and so a genuine `date` column can drive "is this today"
// checks (see useLiveActivity below).
export function useCalendarEvents() {
  const staticFallback = staticCalendarEvents.map((e) => ({ ...e, slug: null }));
  return useSupabaseList("calendar_events", {
    staticFallback,
    orderBy: "event_date",
    mapRow: (r) => ({
      date: r.event_date,
      title: r.title,
      cat: (r.category || "").toLowerCase(),
      city: r.city,
      difficulty: r.difficulty,
      slug: r.event_slug,
    }),
  });
}

// Real, admin-manageable weekly session schedule for the Weekly Rides page
// and Home's Weekly Activities preview — each session's `slug` gives it its
// own page at /weekly-rides/<slug> (see useWeeklySession below).
export function useWeeklySessions() {
  const staticFallback = staticWeeklySessions;
  return useSupabaseList("weekly_sessions", {
    staticFallback,
    mapRow: (r) => ({
      id: r.id,
      slug: r.slug,
      day: r.day,
      name: r.name,
      time: r.time,
      location: r.location,
      format: r.format,
      difficulty: r.difficulty,
      paceGroup: r.pace_group,
      routeMapQuery: r.route_map_query,
      cost: r.cost,
      description: r.description,
    }),
  });
}

// A single weekly session by slug (or id, as a fallback) — powers the
// per-activity detail page.
export function useWeeklySession(slugOrId) {
  const sessions = useWeeklySessions();
  return sessions.find((s) => s.slug === slugOrId || s.id === slugOrId);
}

// Small generic key/value settings table (see api/.env-free equivalent:
// admin-editable, no code changes needed). Currently just the sponsor deck
// download link, but built to hold any future one-off setting too.
export function useSiteSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("key,value")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map = {};
        data.forEach((r) => {
          map[r.key] = r.value;
        });
        setSettings(map);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}

// Reads a single site_settings value with a static fallback — the piece
// that actually makes text edited in the admin's Site Content page show up
// on the live site. Key convention: "text.<page>.<field>", e.g.
// "text.home.heroTitle". For a page that reads several text fields, prefer
// calling useSiteSettings() once and using pickText() per field instead —
// avoids one Supabase round-trip per field.
export function useSiteText(key, fallback) {
  const settings = useSiteSettings();
  return pickText(settings, key, fallback);
}

export function pickText(settings, key, fallback) {
  return settings[key] ?? fallback;
}

// Every image on the site is defined in data/images.js — this merges in any
// admin-uploaded replacement from the site_images table, keyed the same way
// (see admin/pages/SiteImagesAdmin.jsx). Starts from the static defaults so
// pages never show a blank image while this loads.
export function useSiteImages() {
  const [overrides, setOverrides] = useState({});
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("site_images")
      .select("key,url")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map = {};
        data.forEach((r) => {
          map[r.key] = r.url;
        });
        setOverrides(map);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { ...staticImages, ...overrides };
}

// Gallery items tagged to a specific event (via the Gallery admin's optional
// "Event" field) — used by the event detail page's "View Event Gallery"
// link so it shows only that event's photos/videos instead of the whole
// site gallery.
export function useEventGallery(eventSlug) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !eventSlug) return;
    let cancelled = false;
    supabase
      .from("gallery_items")
      .select("*")
      .eq("event_slug", eventSlug)
      .eq("published", true)
      .order("sort_order")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setItems(data.map((r) => ({ url: r.media_url, type: r.media_type, caption: r.caption, category: r.category })));
      });
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);
  return items;
}

// Drives the login popup's "Live" vs "Upcoming" sections. LIVE means a real
// weekly session falls on today's weekday, or a real calendar entry is
// dated today — genuine data checks, not a fake/hardcoded "today" label.
export function useLiveActivity() {
  const sessions = useWeeklySessions();
  const calendarEvents = useCalendarEvents();
  const upcomingEvent = useUpcomingEvent();

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayIso = new Date().toISOString().slice(0, 10);

  const todaysSession = sessions.find((s) => s.day === todayName) || null;
  const todaysCalendarEvent = calendarEvents.find((e) => e.date === todayIso) || null;

  const nextCalendarEvent =
    calendarEvents
      .filter((e) => e.date >= todayIso)
      .sort((a, b) => (a.date > b.date ? 1 : -1))[0] || null;

  return { todaysSession, todaysCalendarEvent, upcomingEvent, nextCalendarEvent };
}
