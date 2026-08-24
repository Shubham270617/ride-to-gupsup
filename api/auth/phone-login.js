import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// POST /api/auth/phone-login — lets someone log in with {phone, password}.
// Supabase Auth itself only recognizes email or an SMS-verified phone as a
// login identity, and this project deliberately skips SMS (every provider
// charges for it — see AuthGate.jsx). So instead: look up which email that
// phone belongs to (profiles.phone, saved at signup), then run the normal
// password check against that email. Same security properties as
// email+password login, just a different lookup key — never reveals
// whether a phone number exists (both "no such phone" and "wrong password"
// return the same invalid_credentials error).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { phone, password } = req.body || {};
  if (!phone || !password) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseAdmin || !supabaseUrl || !anonKey) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();

  if (!profile?.email) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email: profile.email, password });

  if (error || !data.session) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
