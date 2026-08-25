import { supabase } from "./supabaseClient";

// Calls api/auth/claim-bootstrap-admin — the only path that can grant admin
// without an existing admin doing it from the Admins screen. Only ever
// succeeds for one of the first 3 people to ever authenticate through
// /admin/login. Used right after a successful sign-in on /admin/login and
// in the Google OAuth callback, whenever the account isn't already an
// admin.
//
// Note: /api/* routes only exist on Vercel (production, or `vercel dev`
// locally) — a plain `npm run dev` / `vite` dev server 404s on them, which
// this reports as reason: "request_failed" (distinct from "seats_full", the
// real "you're not one of the first 3" outcome) so the UI can tell "the
// server couldn't be reached" apart from "you're genuinely not eligible."
export async function claimBootstrapAdmin() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { granted: false, reason: "no_session" };
  try {
    const res = await fetch("/api/auth/claim-bootstrap-admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { granted: false, reason: "request_failed" };
    return await res.json();
  } catch {
    return { granted: false, reason: "request_failed" };
  }
}
