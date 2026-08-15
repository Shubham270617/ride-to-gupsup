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
    }),
  });
}
