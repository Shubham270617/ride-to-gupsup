import { useEffect } from "react";
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
// ============================================================================

export const APPEARANCE_KEYS = {
  scale: "text.theme.scale",
  font: "text.theme.font",
  color: "text.theme.color",
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

const pick = (list, value) => list.find((o) => o.value === value) || list[0];

export function resolveAppearance(settings = {}) {
  const scale = pick(TEXT_SCALES, settings[APPEARANCE_KEYS.scale] ?? "1");
  const font = pick(BODY_FONTS, settings[APPEARANCE_KEYS.font] ?? "default");
  const color = pick(TEXT_COLORS, settings[APPEARANCE_KEYS.color] ?? "default");
  return { scale, font, color };
}

// Written to localStorage after each apply, and replayed on the next page
// load before the settings request comes back. Without it every visitor
// sees a frame of the default styling first, which reads as a flicker.
const CACHE_KEY = "rtg_appearance";

export function applyAppearance(settings, element = document.documentElement) {
  const { scale, font, color } = resolveAppearance(settings);
  element.style.setProperty("--rtg-text-scale", scale.value);
  element.style.setProperty("--font-sans", font.stack);
  element.style.setProperty("--color-rtg-white", color.ink);
  element.style.setProperty("--color-rtg-mist", color.muted);
  return { scale, font, color };
}

export function applyCachedAppearance() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) applyAppearance(JSON.parse(raw));
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
      })
    );
  } catch {
    /* storage unavailable — only costs the flicker on the next load */
  }
}

// Mounted once, in App. Reads the saved settings and applies them.
export function useAppearance() {
  const settings = useSiteSettings();
  const scale = settings[APPEARANCE_KEYS.scale];
  const font = settings[APPEARANCE_KEYS.font];
  const color = settings[APPEARANCE_KEYS.color];

  useEffect(() => {
    // An empty settings map means the request hasn't landed yet — leave the
    // cached values in place rather than flashing back to the defaults.
    if (scale === undefined && font === undefined && color === undefined) return;
    const next = {
      [APPEARANCE_KEYS.scale]: scale,
      [APPEARANCE_KEYS.font]: font,
      [APPEARANCE_KEYS.color]: color,
    };
    applyAppearance(next);
    cacheAppearance(next);
  }, [scale, font, color]);
}
