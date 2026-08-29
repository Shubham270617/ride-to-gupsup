import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  products as staticProducts,
  blogPosts as staticBlogPosts,
  challenges as staticChallenges,
  testimonials as staticTestimonials,
  teamMembers as staticTeamMembers,
  raceResults as staticRaceResults,
  calendarEvents as staticCalendarEvents,
  weeklySessions as staticWeeklySessions,
  brand,
} from "../data/content";
import { images as staticImages } from "../data/images";

/**
 * Fetches a published-content table from Supabase and swaps it in once
 * loaded. Starts from the static content.js/images.js values so pages never
 * show a blank/loading state — if Supabase is unreachable or a table is
 * still empty, the static fallback just stays on screen.
 *
 * Also reports `loading` (true until the real fetch settles, one way or
 * another). Most callers only need the list and can ignore it — but a
 * detail page doing `items.find(slug)` MUST wait for loading to finish
 * before deciding "not found": on the very first render, `items` is still
 * just the static fallback, which usually doesn't contain the real slug
 * being looked up, so redirecting immediately would fire before the real
 * data — the one that actually has the match — ever gets a chance to load.
 */
function useSupabaseList(table, { staticFallback, mapRow, orderBy = "sort_order", ascending = true, filterPublished = true }) {
  const [items, setItems] = useState(staticFallback);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let query = supabase.from(table).select("*");
    if (filterPublished) query = query.eq("published", true);
    query = query.order(orderBy, { ascending });

    let cancelled = false;
    query.then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data && data.length > 0) setItems(data.map(mapRow));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [table]);

  return { items, loading };
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
  status: r.event_status || "Upcoming",
  calendarDate: r.calendar_date,
  route: r.route_info,
  routeMapQuery: r.route_map_query,
  elevation: r.elevation_gain,
  gpxUrl: r.gpx_url,
  results: r.results_summary,
  previousEdition: r.previous_edition_summary,
});

// No placeholder fallback — only real, admin-added events should ever show
// up anywhere on the site. Until an admin adds one, this stays empty.
export function useEvents() {
  return useSupabaseList("events", { staticFallback: [], mapRow: mapEventRow }).items;
}

// Used only for the "Upcoming Event" teaser in the login popup — unlike
// useEvents(), this never falls back to placeholder content, so the teaser
// simply doesn't render until a real event exists in the database.
export function useUpcomingEvent() {
  const { items: events } = useSupabaseList("events", { staticFallback: [], mapRow: mapEventRow });
  return events.find((e) => e.featured) || events[0] || null;
}

/** Find one event by slug/id — used by the event detail page. Returns
 * `loading` too: while it's true, `event` being undefined doesn't yet mean
 * "no such event," just "the real data hasn't arrived yet" — see the
 * useSupabaseList comment above for why that distinction matters here. */
export function useEvent(slugOrId) {
  const { items: events, loading } = useSupabaseList("events", { staticFallback: [], mapRow: mapEventRow });
  const event = events.find((e) => e.slug === slugOrId || e.id === slugOrId);
  return { event, loading };
}

const mapProductRow = (r) => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  tag: r.tag,
  image: r.image_url,
  description: r.description,
  sizes: r.sizes || [],
  inStock: r.in_stock !== false,
});

export function useProducts() {
  return useSupabaseList("products", {
    staticFallback: staticProducts,
    filterPublished: false,
    mapRow: mapProductRow,
  }).items;
}

// A single product by id — powers the product detail page
// (/merchandise/:id). Returns `loading` for the same reason useEvent does:
// on the very first render `items` is still just the static fallback,
// which won't contain a real admin-added product's id.
export function useProduct(id) {
  const { items, loading } = useSupabaseList("products", {
    staticFallback: staticProducts,
    filterPublished: false,
    mapRow: mapProductRow,
  });
  const product = items.find((p) => p.id === id);
  return { product, loading };
}

export function useBlogPosts() {
  return useSupabaseList("blog_posts", {
    staticFallback: staticBlogPosts,
    orderBy: "published_at",
    mapRow: (r) => ({ id: r.id, title: r.title, category: r.category, excerpt: r.excerpt, image: r.cover_image_url }),
  }).items;
}

export function useChallenges() {
  return useSupabaseList("challenges", {
    staticFallback: staticChallenges,
    filterPublished: false,
    mapRow: (r) => ({ title: r.title, period: r.period, desc: r.description }),
  }).items;
}

// Never falls back to placeholder company names — showing fake "sponsors"
// would misrepresent real partnerships, so this section only renders once
// an admin has added at least one real sponsor.
export function useSponsors() {
  return useSupabaseList("sponsors", {
    staticFallback: [],
    filterPublished: false,
    mapRow: (r) => ({ name: r.name, logo: r.logo_url, tier: r.tier, website: r.website_url }),
  }).items;
}

export function useTestimonials() {
  return useSupabaseList("testimonials", {
    staticFallback: staticTestimonials,
    mapRow: (r) => ({ name: r.name, role: r.role, quote: r.quote, image: r.avatar_url }),
  }).items;
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
  }).items;
}

export function useTeamMembers() {
  const staticFallback = staticTeamMembers.map((t) => ({ ...t, image: staticImages[t.avatarKey] }));
  return useSupabaseList("team_members", {
    staticFallback,
    mapRow: (r) => ({ name: r.name, role: r.role, city: r.city, sport: r.sport, instagramUrl: r.instagram_url, image: r.avatar_url }),
  }).items;
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
  }).items;
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
  }).items;
}

const mapWeeklySessionRow = (r) => ({
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
});

// Real, admin-manageable weekly session schedule for the Weekly Rides page
// and Home's Weekly Activities preview — each session's `slug` gives it its
// own page at /weekly-rides/<slug> (see useWeeklySession below).
export function useWeeklySessions() {
  return useSupabaseList("weekly_sessions", { staticFallback: staticWeeklySessions, mapRow: mapWeeklySessionRow }).items;
}

// A single weekly session by slug (or id, as a fallback) — powers the
// per-activity detail page. Returns `loading` for the same reason useEvent
// does: don't treat "not found yet" as "doesn't exist" until the real
// fetch has actually settled.
export function useWeeklySession(slugOrId) {
  const { items: sessions, loading } = useSupabaseList("weekly_sessions", {
    staticFallback: staticWeeklySessions,
    mapRow: mapWeeklySessionRow,
  });
  const session = sessions.find((s) => s.slug === slugOrId || s.id === slugOrId);
  return { session, loading };
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

// The "Present Across India" city list — edited in one place (Site Content
// admin, under Home) and shared by every page that shows it (Home, Sponsors,
// Community), so they can't drift out of sync. Falls back to brand.cities
// (data/content.js) until an admin sets it.
export function useCities() {
  const settings = useSiteSettings();
  const raw = pickText(settings, "text.home.citiesList", "");
  const parsed = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return parsed.length ? parsed : brand.cities;
}

// The states chip list ("Present Across India" on Home, "RTG Across India"
// on Community) — separate from useCities() above, which only feeds
// Sponsors' "X+ Indian cities" reach stat and shouldn't change just because
// the presence chips switch from city names to state names.
export function useStates() {
  const settings = useSiteSettings();
  const raw = pickText(settings, "text.home.statesList", "");
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : brand.states;
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
