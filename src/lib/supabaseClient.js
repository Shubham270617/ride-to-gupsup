import { createClient } from "@supabase/supabase-js";

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

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
