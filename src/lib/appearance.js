import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "./publicData";

// ============================================================================
// SITE APPEARANCE — text size, typeface and text colour, set by an admin in
// Admin -> Appearance and applied to the public site without touching code.
//
// Like a word processor: the size is a number of pixels (8 … 24, where 16 is
// the normal web size) and the font is picked from a familiar list (Arial,
// Times New Roman, Georgia …). Both can be set for the whole site and
// overridden per page. Colour is a small set of contrast-checked presets.
//
// How it is applied: by overriding the design tokens the whole site already
// uses (--font-sans, --color-rtg-white, --color-rtg-mist) plus a root font
// scale, all set on <html>. Nothing targets individual components. Scaling
// the ROOT font size is what keeps the layout intact — Tailwind's spacing
// and type scales are in rem, so padding, gaps and text all grow together.
// Headings keep the RTG display font; this changes body text.
//
// Per page: { "/events": { size: 18, font: "georgia" }, … } in one JSON
// setting, applied as the visitor moves between pages. A page's entry also
// covers the pages under it (an event's page follows /events). Anything a
// page doesn't set follows the sitewide choice.
//
// Per section: inside a page, any section tagged data-text-section="<name>"
// can have its own font and size too: { "/community": { "network": { size:
// 20 } } } in one JSON setting. Every font size on the public site is
// multiplied by var(--rtg-sec, 1), and a generated <style> sets --rtg-sec
// (section size ÷ page size) and the font on that section only.
//
// The admin area is never restyled — always 16px Montserrat — so a tiny or
// huge choice can't make the dashboard itself unusable. Admin -> Appearance
// has its own live preview instead.
// ============================================================================

export const APPEARANCE_KEYS = {
  size: "text.theme.size",
  scale: "text.theme.scale", // older setting (0.94 / 1 / 1.06 / 1.12), still honoured
  font: "text.theme.font",
  color: "text.theme.color",
  pages: "text.theme.pages",
  sections: "text.theme.sections",
  sizeOptions: "text.theme.sizeOptions",
};

export const DEFAULT_SIZE = 16;
// Any size from MIN_SIZE to MAX_SIZE px is accepted. FONT_SIZES is the
// default list the admin's size boxes offer; admins can add or remove sizes
// in Admin -> Appearance -> Size list, saved as text.theme.sizeOptions.
export const MIN_SIZE = 6;
export const MAX_SIZE = 120;
export const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72];

// A word of warning shown next to sizes that are allowed but risky.
export function sizeNote(px) {
  if (px < 12) return "Very small — hard to read, especially on phones";
  if (px < 14) return "Small — fine on desktop, tight on phones";
  if (px > 48) return "Huge — best for a short section; long text may overflow its boxes";
  if (px > 20) return "Very large — pages get long and some layouts get tight";
  if (px === DEFAULT_SIZE) return "Normal web size";
  return "";
}

// `google` = loaded from Google Fonts only when chosen; the rest are
// already loaded by index.css or installed on most computers (with a safe
// fallback where a phone doesn't have them).
export const BODY_FONTS = [
  { value: "default", label: "Montserrat", hint: "RTG default", stack: '"Montserrat", Arial, sans-serif' },
  { value: "grotesk", label: "Space Grotesk", hint: "Technical", stack: '"Space Grotesk", "Montserrat", Arial, sans-serif' },
  { value: "arial", label: "Arial", hint: "Classic", stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { value: "verdana", label: "Verdana", hint: "Wide, very readable", stack: "Verdana, Geneva, Tahoma, sans-serif" },
  { value: "tahoma", label: "Tahoma", hint: "Compact", stack: "Tahoma, Verdana, Segoe, sans-serif" },
  { value: "trebuchet", label: "Trebuchet MS", hint: "Friendly", stack: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  { value: "segoe", label: "Segoe UI", hint: "Windows style", stack: '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif' },
  { value: "system", label: "System default", hint: "Matches the device", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' },
  { value: "times", label: "Times New Roman", hint: "Serif, newspaper", stack: '"Times New Roman", Times, Georgia, serif' },
  { value: "georgia", label: "Georgia", hint: "Serif, elegant", stack: 'Georgia, "Times New Roman", serif' },
  { value: "courier", label: "Courier New", hint: "Typewriter", stack: '"Courier New", Courier, monospace' },
  { value: "roboto", label: "Roboto", hint: "Google", stack: '"Roboto", Arial, sans-serif', google: "Roboto:wght@400;500;700" },
  { value: "opensans", label: "Open Sans", hint: "Google", stack: '"Open Sans", Arial, sans-serif', google: "Open+Sans:wght@400;600;700" },
  { value: "lato", label: "Lato", hint: "Google", stack: '"Lato", Arial, sans-serif', google: "Lato:wght@400;700" },
  { value: "poppins", label: "Poppins", hint: "Google", stack: '"Poppins", Arial, sans-serif', google: "Poppins:wght@400;500;600;700" },
  { value: "inter", label: "Inter", hint: "Google", stack: '"Inter", Arial, sans-serif', google: "Inter:wght@400;500;600;700" },
  { value: "nunito", label: "Nunito", hint: "Google, rounded", stack: '"Nunito", Arial, sans-serif', google: "Nunito:wght@400;600;700" },
  { value: "raleway", label: "Raleway", hint: "Google", stack: '"Raleway", Arial, sans-serif', google: "Raleway:wght@400;500;600;700" },
  { value: "merriweather", label: "Merriweather", hint: "Google, serif", stack: '"Merriweather", Georgia, serif', google: "Merriweather:wght@400;700" },
  { value: "playfair", label: "Playfair Display", hint: "Google, serif", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
];

export const TEXT_COLORS = [
  { value: "default", label: "Default ink", hint: "Deep purple-black", ink: "#17121f", muted: "#6d6772" },
  { value: "contrast", label: "High contrast", hint: "Darkest — best legibility", ink: "#0b0712", muted: "#4a4550" },
  { value: "soft", label: "Softer", hint: "Gentler on bright screens", ink: "#2a2435", muted: "#7d7784" },
];

// Every public page an admin can style on its own, grouped for the admin
// screen. `path` matches that page and everything under it (so /events
// covers /events/<slug>); `exact` matches only the page itself.
export const PAGE_TEXT_TARGETS = [
  { group: "Main pages", path: "/", label: "Home", exact: true },
  { group: "Main pages", path: "/about", label: "About" },
  { group: "Main pages", path: "/community", label: "Community" },
  { group: "Main pages", path: "/volunteer", label: "RTG Crew (Volunteer)" },
  { group: "Main pages", path: "/chat", label: "Chat" },
  { group: "Main pages", path: "/gallery", label: "Gallery" },
  { group: "Main pages", path: "/blog", label: "Blog" },
  { group: "Rides & events", path: "/events", label: "Events (and each event's page)" },
  { group: "Rides & events", path: "/calendar", label: "Calendar" },
  { group: "Rides & events", path: "/weekly-rides", label: "Weekly Rides (and each session)" },
  { group: "Rides & events", path: "/challenges", label: "Challenges" },
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

// The sections of each page, in the order they appear. `id` matches the
// data-text-section tag on that section (unique within its page only).
// Sections built with <Section contentKey=…> use the contentKey; page heroes
// built with <PageHero> are "hero".
export const SECTION_TEXT_TARGETS = {
  "/": [
    { id: "hero", label: "Top banner (slides)" },
    { id: "why", label: "Why RTG" },
    { id: "ways", label: "Ways to move" },
    { id: "training", label: "Training formats" },
    { id: "events", label: "Upcoming events" },
    { id: "merch", label: "Merchandise highlights" },
    { id: "gallery", label: "Gallery" },
    { id: "voices", label: "Community voices" },
    { id: "join", label: "Join the movement (bottom band)" },
  ],
  "/about": [
    { id: "hero", label: "Top banner" },
    { id: "about.howItStarted", label: "How it started" },
    { id: "about.whyExists", label: "Why RTG exists" },
    { id: "about.journey", label: "The RTG journey" },
    { id: "about.missionVision", label: "Mission & vision" },
    { id: "about.howWeBring", label: "How we bring the community together" },
    { id: "about.coreValues", label: "Core values" },
    { id: "about.motion", label: "Where we stand today" },
    { id: "about.roadAhead", label: "The road ahead" },
  ],
  "/community": [
    { id: "hero", label: "Top banner" },
    { id: "place", label: "Find your place" },
    { id: "way", label: "The RTG Way" },
    { id: "motion", label: "RTG in Motion" },
    { id: "network", label: "The RTG Network (community cards)" },
    { id: "cities", label: "One community, different cities" },
    { id: "join", label: "Join the movement (bottom band)" },
    { id: "profile-hero", label: "Community profile page — top banner" },
    { id: "profile-about", label: "Community profile page — about and at a glance" },
    { id: "profile-people", label: "Community profile page — people" },
    { id: "profile-highlights", label: "Community profile page — highlights" },
    { id: "profile-moments", label: "Community profile page — moments" },
    { id: "profile-activities", label: "Community profile page — activities" },
    { id: "profile-join", label: "Community profile page — join" },
  ],
  "/volunteer": [
    { id: "hero", label: "Top banner" },
    { id: "leads", label: "Crew leads" },
    { id: "roles", label: "Crew roles (cards and filters)" },
    { id: "journey", label: "How it works" },
  ],
  "/chat": [
    { id: "intro", label: "Log-in card (logged-out visitors)" },
    { id: "banner", label: "Top banner" },
    { id: "sidebar", label: "Sidebar (room, messages, online)" },
    { id: "conversation", label: "Conversation (messages and typing box)" },
  ],
  "/gallery": [
    { id: "hero", label: "Top banner" },
    { id: "grid", label: "Photos" },
  ],
  "/blog": [
    { id: "hero", label: "Top banner" },
    { id: "blog.hero", label: "Posts" },
  ],
  "/events": [
    { id: "hero", label: "Top banner" },
    { id: "board", label: "Events board" },
  ],
  "/calendar": [
    { id: "hero", label: "Top banner" },
    { id: "calendar", label: "Calendar" },
  ],
  "/weekly-rides": [
    { id: "hero", label: "Top banner" },
    { id: "friday", label: "Friday session" },
    { id: "weeklyRides.schedule", label: "Weekly schedule" },
    { id: "weeklyRides.safety", label: "Safety guidelines" },
    { id: "weeklyRides.packList", label: "What to bring" },
    { id: "weeklyRides.faq", label: "Questions" },
  ],
  "/challenges": [
    { id: "hero", label: "Top banner" },
    { id: "challenges.hero", label: "Current challenges" },
  ],
  "/race-results": [
    { id: "hero", label: "Top banner" },
    { id: "raceResults.hero", label: "Results" },
  ],
  "/lab": [
    { id: "hero", label: "Top banner" },
    { id: "labs", label: "Labs" },
    { id: "principles", label: "More than a rank" },
  ],
  "/lab/strava": [{ id: "board", label: "Challenge board" }],
  "/lab/ridge": [
    { id: "intro", label: "Intro" },
    { id: "results", label: "Results board" },
    { id: "trends", label: "Trend graphics" },
    { id: "spotlight", label: "Session spotlight" },
    { id: "personal", label: "Personal trend" },
  ],
  "/merchandise": [
    { id: "hero", label: "Top banner" },
    { id: "drop", label: "The drop (products)" },
    { id: "kit", label: "Build your kit" },
    { id: "limited", label: "Limited edition" },
  ],
  "/membership": [
    { id: "hero", label: "Top banner" },
    { id: "mine", label: "Your memberships" },
    { id: "plans", label: "Plans" },
    { id: "comparison", label: "Comparison" },
    { id: "rhythm", label: "Your next chapter" },
    { id: "faq", label: "Questions" },
    { id: "closing", label: "Closing band" },
  ],
  "/dashboard": [
    { id: "strava-connect", label: "Connect Strava" },
    { id: "memberships", label: "My memberships" },
    { id: "orders", label: "My orders" },
    { id: "strava-activity", label: "My Strava activity" },
    { id: "profile", label: "Athlete profile" },
    { id: "danger", label: "Delete my account" },
  ],
  "/sponsors": [
    { id: "hero", label: "Top banner" },
    { id: "sponsors.why", label: "Why sponsor RTG" },
    { id: "sponsors.current", label: "Current partners" },
    { id: "sponsors.opportunities", label: "Ways to partner" },
    { id: "sponsors.packages", label: "Sponsorship packages" },
  ],
  "/contact": [
    { id: "hero", label: "Top banner" },
    { id: "form", label: "Contact form and details" },
  ],
  "/faq": [
    { id: "hero", label: "Top banner" },
    { id: "questions", label: "Questions" },
  ],
  "/safety": [
    { id: "hero", label: "Top banner" },
    { id: "safety.guidelines", label: "General safety guidelines" },
    { id: "safety.checklist", label: "Weekly session checklist" },
  ],
  "/privacy": [{ id: "content", label: "Policy text" }],
  "/terms": [{ id: "content", label: "Terms text" }],
  "/community-guidelines": [{ id: "content", label: "Guidelines text" }],
};

const VALID_FONTS = new Set(BODY_FONTS.map((f) => f.value));
const KNOWN_PATHS = new Set(PAGE_TEXT_TARGETS.map((t) => t.path));

// A saved size, or null if it isn't one of the offered sizes. Also accepts
// the older scale presets (0.94 / 1 / 1.06 / 1.12), turned into pixels.
// A size in pixels (6–120, to the nearest half pixel), or null. Values
// between 0.5 and 2 are the older scale presets, turned into pixels.
export function toSize(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const px = n > 0.5 && n < 2 ? Math.round(n * DEFAULT_SIZE) : Math.round(n * 2) / 2;
  return px >= MIN_SIZE && px <= MAX_SIZE ? px : null;
}

// The sizes the admin's size boxes offer: the saved list if there is one,
// else FONT_SIZES. Sorted, de-duplicated, and always including 16.
export function parseSizeOptions(raw) {
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = null;
    }
  }
  const sizes = Array.isArray(list) ? list.map(toSize).filter(Boolean) : [];
  const base = sizes.length ? sizes : FONT_SIZES;
  return [...new Set([...base, DEFAULT_SIZE])].sort((a, b) => a - b);
}

const toFont = (value) => (VALID_FONTS.has(value) ? value : null);

// The saved per-page choices, keeping only known pages, offered sizes and
// offered fonts — a hand-edited or stale value can never set something
// arbitrary. Older saves stored just a scale per page ("/events": "1.06").
export function parsePageSettings(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [path, entry] of Object.entries(obj)) {
    if (!KNOWN_PATHS.has(path)) continue;
    const size = toSize(entry && typeof entry === "object" ? entry.size : entry);
    const font = entry && typeof entry === "object" ? toFont(entry.font) : null;
    if (size || font) out[path] = { ...(size ? { size } : {}), ...(font ? { font } : {}) };
  }
  return out;
}

// The saved per-section choices: { "/community": { "network": { size, font } } },
// keeping only known pages, known sections, offered sizes and fonts.
export function parseSectionSettings(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [path, sections] of Object.entries(obj)) {
    const known = SECTION_TEXT_TARGETS[path];
    if (!known || !sections || typeof sections !== "object") continue;
    for (const [id, entry] of Object.entries(sections)) {
      if (!known.some((t) => t.id === id) || !entry || typeof entry !== "object") continue;
      const size = toSize(entry.size);
      const font = toFont(entry.font);
      if (!size && !font) continue;
      out[path] = out[path] || {};
      out[path][id] = { ...(size ? { size } : {}), ...(font ? { font } : {}) };
    }
  }
  return out;
}

// Which page entry applies to a URL: the most specific match wins, so
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
export const fontByValue = (value) => pick(BODY_FONTS, value);

// The sitewide size: the newer pixel setting, else the older scale, else 16.
export function sitewideSize(settings = {}) {
  return toSize(settings[APPEARANCE_KEYS.size]) ?? toSize(settings[APPEARANCE_KEYS.scale]) ?? DEFAULT_SIZE;
}

// What a given page gets. `pathname` under /admin always gets the plain
// defaults for size and font.
export function resolveAppearance(settings = {}, pathname = "") {
  const color = pick(TEXT_COLORS, settings[APPEARANCE_KEYS.color] ?? "default");
  if (pathname.startsWith("/admin")) {
    return { size: DEFAULT_SIZE, font: BODY_FONTS[0], color };
  }
  const target = pathname ? pageTargetFor(pathname) : null;
  const page = target ? parsePageSettings(settings[APPEARANCE_KEYS.pages])[target.path] || {} : {};
  const size = page.size ?? sitewideSize(settings);
  const font = pick(BODY_FONTS, page.font ?? settings[APPEARANCE_KEYS.font] ?? "default");
  return { size, font, color };
}

const cssString = (value) => `"${String(value).replace(/["\\]/g, "")}"`;

// The CSS that gives this page's sections their own font and size, or "".
// A section's size is relative to the page size it sits in, so it's applied
// as --rtg-sec = section px ÷ page px (every font size multiplies by it).
export function sectionCss(settings = {}, pathname = "") {
  if (!pathname || pathname.startsWith("/admin")) return "";
  const target = pageTargetFor(pathname);
  if (!target) return "";
  const sections = parseSectionSettings(settings[APPEARANCE_KEYS.sections])[target.path];
  if (!sections) return "";
  const pageSize = resolveAppearance(settings, pathname).size;
  return Object.entries(sections)
    .map(([id, entry]) => {
      const rules = [];
      if (entry.size) rules.push(`--rtg-sec: ${parseFloat((entry.size / pageSize).toFixed(4))};`);
      if (entry.font) {
        const font = fontByValue(entry.font);
        ensureFontLoaded(font);
        rules.push(`--font-sans: ${font.stack};`, `font-family: ${font.stack};`);
      }
      return `[data-text-section=${cssString(id)}] { ${rules.join(" ")} }`;
    })
    .join("\n");
}

function writeSectionCss(css) {
  if (typeof document === "undefined") return;
  let tag = document.getElementById("rtg-section-text");
  if (!css) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "rtg-section-text";
    document.head.appendChild(tag);
  }
  if (tag.textContent !== css) tag.textContent = css;
}

// Google-hosted fonts are fetched only when actually used.
export function ensureFontLoaded(font) {
  if (!font?.google || typeof document === "undefined") return;
  const id = `rtg-font-${font.value}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

// Written to localStorage after each apply, and replayed on the next page
// load before the settings request comes back. Without it every visitor
// sees a frame of the default styling first, which reads as a flicker.
const CACHE_KEY = "rtg_appearance";

export function applyAppearance(settings, element = document.documentElement, pathname = window.location.pathname) {
  const result = resolveAppearance(settings, pathname);
  ensureFontLoaded(result.font);
  element.style.setProperty("--rtg-text-scale", String(result.size / DEFAULT_SIZE));
  element.style.setProperty("--font-sans", result.font.stack);
  element.style.setProperty("--color-rtg-white", result.color.ink);
  element.style.setProperty("--color-rtg-mist", result.color.muted);
  if (element === document.documentElement) writeSectionCss(sectionCss(settings, pathname));
  return result;
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
        [APPEARANCE_KEYS.size]: String(sitewideSize(settings)),
        [APPEARANCE_KEYS.font]: settings[APPEARANCE_KEYS.font] ?? "default",
        [APPEARANCE_KEYS.color]: settings[APPEARANCE_KEYS.color] ?? "default",
        [APPEARANCE_KEYS.pages]: settings[APPEARANCE_KEYS.pages] ?? "{}",
        [APPEARANCE_KEYS.sections]: settings[APPEARANCE_KEYS.sections] ?? "{}",
      })
    );
  } catch {
    /* storage unavailable — only costs the flicker on the next load */
  }
}

// Mounted once, in App. Reads the saved settings and applies them — again
// on every page change, since a page may have its own size and font.
export function useAppearance() {
  const settings = useSiteSettings();
  const { pathname } = useLocation();
  const size = settings[APPEARANCE_KEYS.size];
  const scale = settings[APPEARANCE_KEYS.scale];
  const font = settings[APPEARANCE_KEYS.font];
  const color = settings[APPEARANCE_KEYS.color];
  const pages = settings[APPEARANCE_KEYS.pages];
  const sections = settings[APPEARANCE_KEYS.sections];

  useEffect(() => {
    // Nothing loaded yet — apply the cached values for this page rather than
    // flashing back to the defaults.
    if ([size, scale, font, color, pages, sections].every((v) => v === undefined)) {
      applyCachedAppearance(pathname);
      return;
    }
    const next = {
      [APPEARANCE_KEYS.size]: size,
      [APPEARANCE_KEYS.scale]: scale,
      [APPEARANCE_KEYS.font]: font,
      [APPEARANCE_KEYS.color]: color,
      [APPEARANCE_KEYS.pages]: pages,
      [APPEARANCE_KEYS.sections]: sections,
    };
    applyAppearance(next, document.documentElement, pathname);
    cacheAppearance(next);
  }, [size, scale, font, color, pages, sections, pathname]);
}
