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
  faqs as staticFaqs,
  rideFaqs as staticRideFaqs,
  rideSafety as staticRideSafety,
  whatToBring as staticWhatToBring,
  generalSafety as staticGeneralSafety,
  sponsorTiers as staticSponsorTiers,
  sponsorOpportunities as staticSponsorOpportunities,
  sizeGuide as staticSizeGuide,
  merchReviews as staticMerchReviews,
  heroSlides as staticHeroSlides,
  heroCopy as staticHeroCopy,
  stats as staticStats,
  whyJoin as staticWhyReasons,
  homeWhyCopy as staticHomeWhyCopy,
  homeWays as staticHomeWays,
  homeWaysCopy as staticHomeWaysCopy,
  homeTrainingFormats as staticTrainingFormats,
  homeEventsCopy as staticHomeEventsCopy,
  homeMerchCopy as staticHomeMerchCopy,
  homeGalleryCopy as staticHomeGalleryCopy,
  homeVoicesCopy as staticHomeVoicesCopy,
  joinCopy as staticJoinCopy,
  footerCopy as staticFooterCopy,
  footerLinks as staticFooterLinks,
  eventsPageCopy as staticEventsPageCopy,
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
  status: r.event_status || "Community",
  tone: r.tone,
  calendarDate: r.calendar_date,
  route: r.route_info,
  routeMapQuery: r.route_map_query,
  elevation: r.elevation_gain,
  gpxUrl: r.gpx_url,
  results: r.results_summary,
  previousEdition: r.previous_edition_summary,
  // Optional extras for the Home "Upcoming Events" slide — the section
  // derives sensible values from the fields above when these are empty.
  home: {
    titleAccent: r.home_title_accent,
    pills: (r.home_pills || "").split(",").map((p) => p.trim()).filter(Boolean),
    highlightLabel: r.highlight_label,
    highlightTitle: r.highlight_title,
    highlightText: r.highlight_text,
    secondaryLabel: r.secondary_button_label,
    secondaryLink: r.secondary_button_link,
  },
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
  eyebrow: r.eyebrow,
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

// "Label | Value" per line -> [{ label, value }], skipping blank lines and
// any line that doesn't actually contain the "|" separator (so a half-typed
// admin entry doesn't crash the page, it just gets silently dropped).
const parsePipeLines = (text) =>
  (text || "")
    .split("\n")
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter(([label, value]) => label && value)
    .map(([label, value]) => ({ label, value }));

const parseTags = (text) =>
  (text || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

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

// Content that used to be hardcoded in data/content.js with no admin path
// at all — see Admin -> FAQ / Ride Safety Checklist / etc. Each still keeps
// its content.js array as a static fallback, same pattern as everything
// else in this file, so a page never shows blank while real rows load or
// before an admin has added any.
export function useFaqs() {
  return useSupabaseList("faqs", {
    staticFallback: staticFaqs,
    mapRow: (r) => ({ q: r.question, a: r.answer }),
  }).items;
}

export function useRideFaqs() {
  return useSupabaseList("ride_faqs", {
    staticFallback: staticRideFaqs,
    mapRow: (r) => ({ q: r.question, a: r.answer }),
  }).items;
}

export function useRideSafety() {
  return useSupabaseList("ride_safety", {
    staticFallback: staticRideSafety,
    mapRow: (r) => r.item,
  }).items;
}

export function useWhatToBring() {
  return useSupabaseList("what_to_bring", {
    staticFallback: staticWhatToBring,
    mapRow: (r) => r.item,
  }).items;
}

export function useGeneralSafety() {
  return useSupabaseList("general_safety", {
    staticFallback: staticGeneralSafety,
    mapRow: (r) => ({ title: r.title, desc: r.description }),
  }).items;
}

export function useSponsorTiers() {
  return useSupabaseList("sponsor_tiers", {
    staticFallback: staticSponsorTiers,
    mapRow: (r) => ({ name: r.name, price: r.price, perks: r.perks || [] }),
  }).items;
}

export function useSponsorOpportunities() {
  return useSupabaseList("sponsor_opportunities", {
    staticFallback: staticSponsorOpportunities,
    mapRow: (r) => ({ title: r.title, desc: r.description }),
  }).items;
}

export function useSizeGuide() {
  return useSupabaseList("size_guide", {
    staticFallback: staticSizeGuide,
    mapRow: (r) => ({ size: r.size, chest: r.chest, length: r.length }),
  }).items;
}

export function useMerchReviews() {
  return useSupabaseList("merch_reviews", {
    staticFallback: staticMerchReviews,
    mapRow: (r) => ({ name: r.name, product: r.product, rating: r.rating, quote: r.quote }),
  }).items;
}

// A logged-in member's own synced Strava activities — RLS already
// restricts this table to the owner (or an admin), so no extra filtering
// needed here beyond who's currently signed in.
export function useMyStravaActivities(userId) {
  const [activities, setActivities] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setActivities([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("strava_activities")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!cancelled) setActivities(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return activities;
}

// One member's own leaderboard totals — same public table as the full
// leaderboard, just filtered to one row, for the Dashboard's own summary.
export function useMyLeaderboardStats(userId) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    let cancelled = false;
    supabase
      .from("leaderboard_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setStats(data || null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return stats;
}

// The public leaderboard — reads only the pre-aggregated, public-read
// leaderboard_stats table (see schema.sql), never raw activity rows.
export function useLeaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("leaderboard_stats")
      .select("*")
      .gt("activity_count", 0)
      .order("total_distance_meters", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRows(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return rows;
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

// Same as pickText, but a blank saved value also falls back — for fields
// where "empty" is never what an admin means (a hero headline, a stat).
function pickFilled(settings, key, fallback) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

// The Home hero's per-slide text, in the shape the admin edits it: one flat
// string per field. The metric card's numbers are one "Value | Label" pair
// per line, same convention as weekly_sessions.steps/highlights.
// SiteContentAdmin builds its form from these two exports, so the admin's
// placeholder text and the live site's fallback can't drift apart.
export const HERO_SLIDE_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline — line 1", type: "text" },
  { field: "accent", label: "Headline — line 2 (accent color)", type: "text" },
  { field: "subtitle", label: "Paragraph", type: "textarea" },
  { field: "cardKicker", label: "Floating card — small top line", type: "text" },
  { field: "cardHeading", label: "Floating card — heading", type: "text" },
  { field: "cardMetrics", label: "Floating card — numbers, one per line as \"Value | Label\" (e.g. 45 | KM)", type: "textarea" },
];

export const HERO_COPY_FIELDS = [
  { field: "ctaLabel", label: "Button label", type: "text" },
  { field: "ctaLink", label: "Button link (a page on this site, e.g. /community)", type: "text" },
  { field: "scrollLabel", label: "Label above the slide dots", type: "text" },
  { field: "presenceLabel", label: "Label before the states strip", type: "text" },
  { field: "expandingLabel", label: "Last chip after the states strip", type: "text" },
];

export const heroSlideKey = (slide, field) => `text.home.hero.${slide.key}.${field}`;
export const heroCopyKey = (field) => `text.home.hero.${field}`;

export const heroSlideDefaults = (slide) => ({
  eyebrow: slide.eyebrow,
  title: slide.title,
  accent: slide.accent,
  subtitle: slide.subtitle,
  cardKicker: slide.card.kicker,
  cardHeading: slide.card.heading,
  cardMetrics: slide.card.metrics.map((m) => `${m.value} | ${m.label}`).join("\n"),
});

// content.js heroSlides with every admin override from site_settings merged
// in. Takes the settings map (rather than calling useSiteSettings itself)
// so a page that already has it doesn't pay for a second round-trip.
export function buildHeroSlides(settings) {
  return staticHeroSlides.map((slide) => {
    const defaults = heroSlideDefaults(slide);
    const text = (field) => pickFilled(settings, heroSlideKey(slide, field), defaults[field]);
    const metrics = parsePipeLines(text("cardMetrics")).map(({ label, value }) => ({ value: label, label: value }));
    return {
      ...slide,
      eyebrow: text("eyebrow"),
      title: text("title"),
      accent: text("accent"),
      subtitle: text("subtitle"),
      card: {
        kicker: text("cardKicker"),
        heading: text("cardHeading"),
        metrics: metrics.length ? metrics : slide.card.metrics,
      },
    };
  });
}

export function buildHeroCopy(settings) {
  const copy = {};
  HERO_COPY_FIELDS.forEach(({ field }) => {
    copy[field] = pickFilled(settings, heroCopyKey(field), staticHeroCopy[field]);
  });
  return copy;
}

// Home's "Why RTG" and "More Ways to Move Together" sections — the single
// values around each card list (heading, paragraphs, button). Same shape as
// the hero fields above: SiteContentAdmin builds its form from these.
export const HOME_WHY_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "titleLine1", label: "Headline — line 1", type: "text" },
  { field: "titleLine2", label: "Headline — line 2 (accent color)", type: "text" },
  { field: "subtitle", label: "Paragraph", type: "textarea" },
  { field: "ctaLabel", label: "Button label", type: "text" },
  { field: "ctaLink", label: "Button link (a page on this site, e.g. /community)", type: "text" },
];

export const HOME_WAYS_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline", type: "text" },
  { field: "titleAccent", label: "Headline — last line (accent color)", type: "text" },
  { field: "description", label: "Paragraph", type: "textarea" },
  { field: "descriptionExtra", label: "Second, smaller paragraph", type: "textarea" },
];

export const homeWhyKey = (field) => `text.home.why.${field}`;
export const homeWaysKey = (field) => `text.home.ways.${field}`;

const buildCopy = (settings, fields, keyOf, defaults) =>
  Object.fromEntries(fields.map(({ field }) => [field, pickFilled(settings, keyOf(field), defaults[field])]));

export const buildHomeWhyCopy = (settings) => buildCopy(settings, HOME_WHY_FIELDS, homeWhyKey, staticHomeWhyCopy);
export const buildHomeWaysCopy = (settings) => buildCopy(settings, HOME_WAYS_FIELDS, homeWaysKey, staticHomeWaysCopy);

// The "Why RTG" card stack (Admin -> Why RTG Cards).
export function useWhyReasons() {
  return useSupabaseList("home_why_reasons", {
    staticFallback: staticWhyReasons,
    mapRow: (r) => ({ id: r.id, icon: r.icon, pill: r.pill, title: r.title, desc: r.description }),
  }).items;
}

// The "Ways to Move" photo cards (Admin -> Ways to Move Cards). Fallback
// cards have an `imageKey` into the site images instead of an uploaded
// `image` — the section resolves whichever is present.
export function useHomeWays() {
  return useSupabaseList("home_ways", {
    staticFallback: staticHomeWays,
    mapRow: (r) => ({ id: r.id, kicker: r.kicker, title: r.title, desc: r.description, image: r.image_url, link: r.link_url }),
  }).items;
}

// Home's "Training Formats" showcase (Admin -> Home — Training Formats).
// The table stores what the admin typed; the shapes the section draws are
// parsed here. Fallback formats (data/content.js) use the same raw text, so
// both go through one parser.
const parseTrainingFormat = (f) => ({
  id: f.id,
  tabLabel: f.tabLabel,
  kicker: f.kicker,
  titleLine1: f.titleLine1,
  titleLine2: f.titleLine2,
  // "You | vs | You" -> ["You", "vs", "You"] (big, small, big)
  tagline: (f.tagline || "").split("|").map((p) => p.trim()).filter(Boolean),
  description: f.description,
  pills: parseTags(f.pills),
  note: f.note,
  buttonLabel: f.buttonLabel,
  link: f.link,
  image: f.image,
  imageKey: f.imageKey,
  cardLabel: f.cardLabel,
  cardTitle: f.cardTitle,
  cardImage: f.cardImage,
  cardStats: parseTags(f.cardStats),
  cardSteps: parsePipeLines(f.cardSteps),
  cardMeta: parsePipeLines(f.cardMeta),
  panelRows: parsePipeLines(f.panelRows),
});

export function useTrainingFormats() {
  return useSupabaseList("home_training_formats", {
    staticFallback: staticTrainingFormats.map(parseTrainingFormat),
    mapRow: (r) =>
      parseTrainingFormat({
        id: r.id,
        tabLabel: r.tab_label,
        kicker: r.kicker,
        titleLine1: r.title_line1,
        titleLine2: r.title_line2,
        tagline: r.tagline,
        description: r.description,
        pills: r.pills,
        note: r.note,
        buttonLabel: r.button_label,
        link: r.link_url,
        image: r.image_url,
        cardLabel: r.card_label,
        cardTitle: r.card_title,
        cardImage: r.card_image_url,
        cardStats: r.card_stats,
        cardSteps: r.card_steps,
        cardMeta: r.card_meta,
        panelRows: r.panel_rows,
      }),
  }).items;
}

// Home's "Upcoming Events" heading and button wording (the slides are the
// featured events themselves — see mapEventRow's `home` fields).
export const HOME_EVENTS_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline", type: "text" },
  { field: "titleAccent", label: "Headline — accent-colored part", type: "text" },
  { field: "subtitle", label: "Paragraph", type: "textarea" },
  { field: "primaryLabel", label: "Slide button — opens the event's page", type: "text" },
  { field: "secondaryLabel", label: "Slide second button — default label (an event can set its own)", type: "text" },
  { field: "secondaryLink", label: "Slide second button — default link (e.g. /contact)", type: "text" },
  { field: "allLabel", label: "Button under the slides — label", type: "text" },
  { field: "allLink", label: "Button under the slides — link (e.g. /events)", type: "text" },
  { field: "emptyText", label: "Message shown when there are no upcoming events", type: "textarea" },
];
export const homeEventsKey = (field) => `text.home.events.${field}`;
export const buildHomeEventsCopy = (settings) => buildCopy(settings, HOME_EVENTS_FIELDS, homeEventsKey, staticHomeEventsCopy);

// Home's "Merchandise Highlights" heading and button wording (the cards
// are the store's products — Admin -> Merchandise).
export const HOME_MERCH_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline", type: "text" },
  { field: "titleAccent", label: "Headline — accent-colored part", type: "text" },
  { field: "subtitle", label: "Paragraph", type: "textarea" },
  { field: "addLabel", label: "Card button — product without sizes (adds it to the cart)", type: "text" },
  { field: "chooseLabel", label: "Card button — product with sizes (opens its page to pick one)", type: "text" },
  { field: "soldOutLabel", label: "Card button — product not in stock", type: "text" },
  { field: "storeLabel", label: "Button under the cards — label", type: "text" },
  { field: "storeLink", label: "Button under the cards — link (e.g. /merchandise)", type: "text" },
];
export const homeMerchKey = (field) => `text.home.merch.${field}`;
export const buildHomeMerchCopy = (settings) => buildCopy(settings, HOME_MERCH_FIELDS, homeMerchKey, staticHomeMerchCopy);

// Home's "Community Gallery" wording (the tiles are Admin -> Gallery).
export const HOME_GALLERY_FIELDS = [
  { field: "kicker", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "heading", label: "Headline", type: "text" },
  { field: "headingAccent", label: "Headline — accent-colored part", type: "text" },
  { field: "body", label: "Paragraph", type: "textarea" },
  { field: "buttonLabel", label: "Button label", type: "text" },
  { field: "buttonLink", label: "Button link (e.g. /gallery) — the photos link here too", type: "text" },
  { field: "emptyText", label: "Message shown when the gallery has no photos yet", type: "text" },
];
export const homeGalleryKey = (field) => `text.home.gallery.${field}`;
export const buildHomeGalleryCopy = (settings) => buildCopy(settings, HOME_GALLERY_FIELDS, homeGalleryKey, staticHomeGalleryCopy);

// Home's "What People Say" heading (the slides are Admin -> Testimonials).
export const HOME_VOICES_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline", type: "text" },
  { field: "titleAccent", label: "Headline — accent-colored part", type: "text" },
  { field: "prevLabel", label: "Screen-reader name of the previous arrow", type: "text" },
  { field: "nextLabel", label: "Screen-reader name of the next arrow", type: "text" },
];
export const homeVoicesKey = (field) => `text.home.voices.${field}`;
export const buildHomeVoicesCopy = (settings) => buildCopy(settings, HOME_VOICES_FIELDS, homeVoicesKey, staticHomeVoicesCopy);

// Events page wording (pages/Events.jsx). SiteContentAdmin builds its
// Events page from this list.
export const EVENTS_PAGE_FIELDS = [
  { field: "indexLabel", label: "Hero — small label (left)", type: "text" },
  { field: "indexYear", label: "Hero — small label (right, e.g. the season)", type: "text" },
  { field: "eyebrow", label: "Hero — eyebrow", type: "text" },
  { field: "titleLine1", label: "Hero — headline line 1", type: "text" },
  { field: "titleLine2", label: "Hero — headline line 2 (blue gradient)", type: "text" },
  { field: "titleLine3", label: "Hero — headline line 3 (orange gradient)", type: "text" },
  { field: "intro", label: "Hero — paragraph", type: "textarea" },
  { field: "signals", label: "Hero — dotted tags under the paragraph (comma-separated)", type: "text" },
  { field: "pulseLabel", label: "Hero — label on the event carousel", type: "text" },
  { field: "prevLabel", label: "Hero — screen-reader name of the previous arrow", type: "text" },
  { field: "nextLabel", label: "Hero — screen-reader name of the next arrow", type: "text" },
  { field: "sectionNumber", label: "Board — big number beside the heading", type: "text" },
  { field: "sectionLabel", label: "Board — small label under that number", type: "text" },
  { field: "kicker", label: "Board — eyebrow", type: "text" },
  { field: "heading", label: "Board — headline", type: "text" },
  { field: "headingAccent", label: "Board — headline, accent-colored part", type: "text" },
  { field: "body", label: "Board — paragraph", type: "textarea" },
  { field: "allLabel", label: "Board — name of the \"all events\" filter", type: "text" },
  { field: "viewLabel", label: "Board — button that opens the selected event's page", type: "text" },
  { field: "boardHeading", label: "Grid — heading", type: "text" },
  { field: "boardHint", label: "Grid — hint beside the heading", type: "text" },
  { field: "emptyText", label: "Message shown when there are no events", type: "text" },
];
export const eventsPageKey = (field) => `text.events.${field}`;
export const buildEventsPageCopy = (settings) => buildCopy(settings, EVENTS_PAGE_FIELDS, eventsPageKey, staticEventsPageCopy);

// "Join the Movement" band + site footer (components/sections/JoinCTA.jsx,
// shown on every page). SiteContentAdmin builds its Footer page from these.
export const JOIN_FIELDS = [
  { field: "eyebrow", label: "Eyebrow (small line above the headline)", type: "text" },
  { field: "title", label: "Headline", type: "text" },
  { field: "titleAccent", label: "Headline — accent-colored part", type: "text" },
  { field: "subtitle", label: "Paragraph", type: "textarea" },
  { field: "primaryLabel", label: "First button — label", type: "text" },
  { field: "primaryLink", label: "First button — link (e.g. /community)", type: "text" },
  { field: "secondaryLabel", label: "Second button — label", type: "text" },
  { field: "secondaryLink", label: "Second button — link (e.g. /events)", type: "text" },
];
export const joinKey = (field) => `text.join.${field}`;
export const buildJoinCopy = (settings) => buildCopy(settings, JOIN_FIELDS, joinKey, staticJoinCopy);

export const FOOTER_FIELDS = [
  { field: "description", label: "Description (beside the logo)", type: "textarea" },
  { field: "logoAlt", label: "Logo description for screen readers", type: "text" },
  { field: "contactHeading", label: "Contact — heading", type: "text" },
  { field: "email", label: "Contact — email", type: "text" },
  { field: "phone", label: "Contact — phone", type: "text" },
  { field: "location", label: "Contact — location", type: "text" },
  { field: "instagramUrl", label: "Instagram link (leave the default to keep it, or replace it)", type: "text" },
  { field: "facebookUrl", label: "Facebook link", type: "text" },
  { field: "youtubeUrl", label: "YouTube link", type: "text" },
  { field: "stravaUrl", label: "Strava link", type: "text" },
  { field: "copyright", label: "Copyright line (after \"© {year}\")", type: "text" },
  { field: "tagline", label: "Bottom-right tagline", type: "text" },
];
export const footerKey = (field) => `text.footer.${field}`;
export const buildFooterCopy = (settings) => buildCopy(settings, FOOTER_FIELDS, footerKey, staticFooterCopy);

// Footer link columns (Admin -> Footer Links): flat rows grouped into
// columns by their column title, columns ordered by column_order, links
// inside a column by sort_order.
export function useFooterColumns() {
  const links = useSupabaseList("footer_links", {
    staticFallback: staticFooterLinks.map((l, i) => ({ ...l, order: i })),
    mapRow: (r) => ({ column: r.column_title, columnOrder: r.column_order, label: r.label, to: r.link_url, order: r.sort_order }),
  }).items;

  const byTitle = new Map();
  links.forEach((link) => {
    if (!byTitle.has(link.column)) byTitle.set(link.column, { title: link.column, order: link.columnOrder, links: [] });
    byTitle.get(link.column).links.push(link);
  });
  return [...byTitle.values()]
    .sort((a, b) => a.order - b.order)
    .map((column) => ({ ...column, links: [...column.links].sort((a, b) => a.order - b.order) }));
}

// The six headline numbers (Home hero, Home/Community proof band) with the
// admin's values and labels merged in. Tolerates "2,50,000" as typed.
export function buildStats(settings) {
  return staticStats.map((s) => {
    const raw = pickFilled(settings, `text.home.stat.${s.key}`, String(s.value));
    return {
      ...s,
      label: pickFilled(settings, `text.home.stat.${s.key}Label`, s.label),
      value: Number(raw.replace(/[,\s]/g, "")) || 0,
    };
  });
}

export function pickStates(settings) {
  const parsed = pickText(settings, "text.home.statesList", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : brand.states;
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
  return pickStates(useSiteSettings());
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
