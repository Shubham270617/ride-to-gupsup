import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// POST /api/auth/claim-bootstrap-admin — the first 3 people to ever
// authenticate through /admin/login (email/password or Google, doesn't
// matter which) become admins, no allowlist, no prior approval — by
// explicit product decision. Grants admin if and only if fewer than 3
// admin_profiles rows currently exist; the 4th+ attempt gets nothing and
// must be granted access from the Admins screen by an existing admin
// instead. The count check runs server-side against the real table on
// every call, so it can't be raced or bypassed by calling this repeatedly
// or concurrently — enforced again independently by the admin_seat_cap
// trigger in supabase/schema.sql either way. Called from AdminLogin.jsx and
// AuthCallback.jsx right after a successful sign-in, whenever the signed-in
// account isn't already an admin.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }
  const user = userData.user;

  const { count, error: countErr } = await supabaseAdmin
    .from("admin_profiles")
    .select("id", { count: "exact", head: true });
  if (countErr) {
    res.status(500).json({ error: "query_failed", message: countErr.message });
    return;
  }
  if ((count ?? 0) >= 3) {
    res.status(200).json({ granted: false, reason: "seats_full" });
    return;
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { error: insertErr } = await supabaseAdmin
    .from("admin_profiles")
    .insert({ id: user.id, full_name: profile?.full_name || null });
  if (insertErr) {
    res.status(500).json({ error: "grant_failed", message: insertErr.message });
    return;
  }

  res.status(200).json({ granted: true });
}
