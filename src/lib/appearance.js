import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "./publicData";

// ============================================================================
// SITE APPEARANCE — text size, typeface and text colour, set by an admin in
// Admin -> Appearance and applied sitewide without touching code.
//
// Everything here is a fixed set of presets rather than free input, and
// that is deliberate: an arbitrary pixel size or hex colour is exactly how
// this kind of feature breaks a layout or makes text unreadable. Each
// option below has been picked to stay within the design.
//
// How it is applied: by overriding the design tokens the whole site already
// uses (--font-sans, --color-rtg-white, --color-rtg-mist) plus a root font
// scale, all set on <html>. Nothing targets individual components, so there
// is no page that can be styled into a corner.
//
// Note on size: scaling the ROOT font size is what keeps the layout intact
// — Tailwind's spacing and type scales are in rem, so padding, gaps and
// text all grow together in proportion. Hard-coded px values elsewhere in
// the stylesheets deliberately do not scale, which is why the range is kept
// narrow.
//
// Per page: an admin can also give any public page its own text size
// (Admin -> Appearance -> Text size per page). That's stored as one JSON
// setting, { "/events": "1.06", … }, and applied as the visitor moves
// between pages; pages left on "Site default" follow the sitewide size.
// Detail pages follow their section (an event's page follows /events).
// The admin dashboard itself always uses the sitewide size.
// ============================================================================

export const APPEARANCE_KEYS = {
  scale: "text.theme.scale",
  font: "text.theme.font",
  color: "text.theme.color",
  pages: "text.theme.pages",
};

export const TEXT_SCALES = [
  { value: "0.94", label: "Compact", hint: "Slightly smaller — fits more on screen" },
  { value: "1", label: "Default", hint: "The size the site was designed at" },
  { value: "1.06", label: "Comfortable", hint: "A touch larger, easier to read" },
  { value: "1.12", label: "Large", hint: "Noticeably larger — best for accessibility" },
];

// Both of these are already loaded by the Google Fonts import at the top of
// index.css, so switching costs no extra network request. A typeface that
// isn't already loaded is not offered — it would mean a flash of unstyled
// text on every page for every visitor.
export const BODY_FONTS = [
  { value: "default", label: "Montserrat", hint: "The RTG default", stack: '"Montserrat", Arial, sans-serif' },
  {
    value: "grotesk",
    label: "Space Grotesk",
    hint: "Slightly more technical",
    stack: '"Space Grotesk", "Montserrat", Arial, sans-serif',
  },
  {
    value: "system",
    label: "System default",
    hint: "Matches the reader's device — fastest",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  },
];

export const TEXT_COLORS = [
  { value: "default", label: "Default ink", hint: "Deep purple-black", ink: "#17121f", muted: "#6d6772" },
  { value: "contrast", label: "High contrast", hint: "Darkest — best legibility", ink: "#0b0712", muted: "#4a4550" },
  { value: "soft", label: "Softer", hint: "Gentler on bright screens", ink: "#2a2435", muted: "#7d7784" },
];

// Every public page an admin can size on its own, grouped for the admin
// screen. `path` matches that page and everything under it (so /events
// covers /events/<slug>); `exact` matches only the page itself.
export const PAGE_TEXT_TARGETS = [
  { group: "Main pages", path: "/", label: "Home", exact: true },
  { group: "Main pages", path: "/about", label: "About" },
  { group: "Main pages", path: "/community", label: "Community" },
  { group: "Main pages", path: "/chat", label: "Chat" },
  { group: "Main pages", path: "/gallery", label: "Gallery" },
  { group: "Main pages", path: "/blog", label: "Blog" },
  { group: "Rides & events", path: "/events", label: "Events (and each event's page)" },
  { group: "Rides & events", path: "/calendar", label: "Calendar" },
  { group: "Rides & events", path: "/weekly-rides", label: "Weekly Rides (and each session)" },
  { group: "Rides & events", path: "/challenges", label: "Challenges" },
  { group: "Rides & events", path: "/race-calendar", label: "Race Calendar" },
  { group: "Rides & events", path: "/race-results", label: "Race Results" },
  { group: "RTG Lab", path: "/lab", label: "Lab", exact: true },
  { group: "RTG Lab", path: "/lab/strava", label: "Lab — Strava Challenge" },
  { group: "RTG Lab", path: "/lab/ridge", label: "Lab — Ridge Repeats" },
  { group: "Store & membership", path: "/merchandise", label: "Store (and product pages)" },
  { group: "Store & membership", path: "/checkout", label: "Checkout" },
  { group: "Store & membership", path: "/membership", label: "Membership (and its checkout)" },
  { group: "Members", path: "/dashboard", label: "My Dashboard" },
  { group: "Info & legal", path: "/sponsors", label: "Sponsors" },
  { group: "Info & legal", path: "/contact", label: "Contact" },
  { group: "Info & legal", path: "/faq", label: "FAQ" },
  { group: "Info & legal", path: "/safety", label: "Safety" },
  { group: "Info & legal", path: "/privacy", label: "Privacy Policy" },
  { group: "Info & legal", path: "/terms", label: "Terms" },
  { group: "Info & legal", path: "/community-guidelines", label: "Community Guidelines" },
];

const VALID_SCALES = new Set(TEXT_SCALES.map((o) => o.value));
const KNOWN_PATHS = new Set(PAGE_TEXT_TARGETS.map((t) => t.path));

// The saved per-page sizes, keeping only known pages and preset sizes — a
// hand-edited or stale value can never set an arbitrary size.
export function parsePageScales(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([path, value]) => KNOWN_PATHS.has(path) && VALID_SCALES.has(String(value)))
      .map(([path, value]) => [path, String(value)])
  );
}

// Which page-size entry applies to a URL: the most specific match wins, so
// /lab/strava beats /lab, and /lab (exact) doesn't swallow /lab/ridge.
export function pageTargetFor(pathname = "/") {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    PAGE_TEXT_TARGETS.filter((t) => (t.exact ? path === t.path : path === t.path || path.startsWith(`${t.path}/`))).sort(
      (a, b) => b.path.length - a.path.length
    )[0] || null
  );
}

const pick = (list, value) => list.find((o) => o.value === value) || list[0];

// `pathname` picks a page's own size when it has one; the admin area always
// uses the sitewide size.
export function resolveAppearance(settings = {}, pathname = "") {
  const sitewide = settings[APPEARANCE_KEYS.scale] ?? "1";
  const target = pathname && !pathname.startsWith("/admin") ? pageTargetFor(pathname) : null;
  const pageScale = target ? parsePageScales(settings[APPEARANCE_KEYS.pages])[target.path] : undefined;
  const scale = pick(TEXT_SCALES, pageScale ?? sitewide);
  const font = pick(BODY_FONTS, settings[APPEARANCE_KEYS.font] ?? "default");
  const color = pick(TEXT_COLORS, settings[APPEARANCE_KEYS.color] ?? "default");
  return { scale, font, color };
}

// Written to localStorage after each apply, and replayed on the next page
// load before the settings request comes back. Without it every visitor
// sees a frame of the default styling first, which reads as a flicker.
const CACHE_KEY = "rtg_appearance";

export function applyAppearance(settings, element = document.documentElement, pathname = window.location.pathname) {
  const { scale, font, color } = resolveAppearance(settings, pathname);
  element.style.setProperty("--rtg-text-scale", scale.value);
  element.style.setProperty("--font-sans", font.stack);
  element.style.setProperty("--color-rtg-white", color.ink);
  element.style.setProperty("--color-rtg-mist", color.muted);
  return { scale, font, color };
}

export function applyCachedAppearance(pathname = window.location.pathname) {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) applyAppearance(JSON.parse(raw), document.documentElement, pathname);
  } catch {
    /* no cache, unreadable storage, or bad JSON — the defaults stand */
  }
}

function cacheAppearance(settings) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        [APPEARANCE_KEYS.scale]: settings[APPEARANCE_KEYS.scale] ?? "1",
        [APPEARANCE_KEYS.font]: settings[APPEARANCE_KEYS.font] ?? "default",
        [APPEARANCE_KEYS.color]: settings[APPEARANCE_KEYS.color] ?? "default",
        [APPEARANCE_KEYS.pages]: settings[APPEARANCE_KEYS.pages] ?? "{}",
      })
    );
  } catch {
    /* storage unavailable — only costs the flicker on the next load */
  }
}

// Mounted once, in App. Reads the saved settings and applies them — again
// on every page change, since a page may have its own text size.
export function useAppearance() {
  const settings = useSiteSettings();
  const { pathname } = useLocation();
  const scale = settings[APPEARANCE_KEYS.scale];
  const font = settings[APPEARANCE_KEYS.font];
  const color = settings[APPEARANCE_KEYS.color];
  const pages = settings[APPEARANCE_KEYS.pages];

  useEffect(() => {
    // An empty settings map means the request hasn't landed yet — apply the
    // cached values for this page rather than flashing back to the defaults.
    if (scale === undefined && font === undefined && color === undefined && pages === undefined) {
      applyCachedAppearance(pathname);
      return;
    }
    const next = {
      [APPEARANCE_KEYS.scale]: scale,
      [APPEARANCE_KEYS.font]: font,
      [APPEARANCE_KEYS.color]: color,
      [APPEARANCE_KEYS.pages]: pages,
    };
    applyAppearance(next, document.documentElement, pathname);
    cacheAppearance(next);
  }, [scale, font, color, pages, pathname]);
}
