import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// POST /api/auth/delete-account — called by the logged-in member themselves
// (Dashboard's "Delete My Account" button). Verifies the caller's own
// session token, then deletes their auth.users row outright. Everything
// else (profiles, admin_profiles, orders, order_items) cascades
// automatically via "on delete cascade" foreign keys — see
// supabase/schema.sql — so nothing else needs to be cleaned up here.
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

  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteErr) {
    res.status(500).json({ error: "delete_failed", message: deleteErr.message });
    return;
  }

  res.status(200).json({ ok: true });
}
