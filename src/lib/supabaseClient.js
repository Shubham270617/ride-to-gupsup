import { createClient } from "@supabase/supabase-js";
import { authStorage } from "./authStorage";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Site still renders fully on static content — this just means login/signup
  // and admin features are inactive until VITE_SUPABASE_URL/ANON_KEY are set
  // in .env.local (see .env.example).
  console.warn(
    "[RTG] Supabase env vars are not set — login, signup, and the admin dashboard are disabled. See .env.example."
  );
}

// storage: see lib/authStorage.js. It routes the session to localStorage or
// sessionStorage depending on whether the member ticked "Remember me" (on by
// default), instead of the hard-coded sessionStorage this used to use — which
// signed everyone out whenever they closed the tab, and never shared a login
// between two tabs.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
