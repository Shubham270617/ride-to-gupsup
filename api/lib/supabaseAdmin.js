import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key — bypasses Row Level
// Security, so this file must never be imported from anything that ships to
// the browser (it isn't; everything under api/ runs as a serverless
// function, never bundled into the Vite frontend build).
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
