import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// On/off switches for parts of the site an admin can open when ready,
// stored in site_settings as "true" / "false". Missing means off.
export const FEATURE_KEYS = {
  // The RTG Crew page (/volunteer) and its "Volunteer" menu link.
  // Turned on in Admin -> Volunteer roles.
  volunteer: "feature.volunteer.enabled",
};

// Layout Studio and the Site visual editor (from Randeep's branch) need the
// page_layout_* tables, which exist only in his TEST project
// (docs/proposals/page-layouts.sql). Hidden until those are a migration.
export const SITE_EDITOR_READY = false;

const cache = new Map();

// { ready, on } for one switch. One small read per switch, shared by every
// component that asks during this page load.
export function useFeature(key) {
  const [on, setOn] = useState(cache.has(key) ? cache.get(key) : null);
  useEffect(() => {
    if (cache.has(key)) return;
    if (!isSupabaseConfigured) {
      setOn(false);
      return;
    }
    let cancelled = false;
    const off = () => {
      if (!cancelled) setOn(false);
    };
    try {
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle()
        .then(({ data }) => {
          const value = data?.value === "true";
          cache.set(key, value);
          if (!cancelled) setOn(value);
        }, off);
    } catch {
      off(); // a switch that can't be read counts as off
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  return { ready: on !== null, on: Boolean(on) };
}

// After an admin flips a switch, so this tab shows the new state.
export function rememberFeature(key, value) {
  cache.set(key, Boolean(value));
}
