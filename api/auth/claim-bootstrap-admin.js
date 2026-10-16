import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// POST /api/auth/claim-bootstrap-admin — called right after a successful
// sign-in on /admin/login (and from the Google callback) to decide whether
// this account may enter the admin dashboard.
//
// Admin access is an EMAIL ALLOWLIST, and this endpoint is where that is
// decided. It used to grant admin to any authenticated caller as long as
// fewer than 2 admin rows existed — no email check at all — which meant any
// member could call it directly with their own token, and revoking an admin
// re-opened that seat to whoever asked next.
//
// Now: the caller's email must appear in admin_allowed_emails, or they get a
// 403 and nothing happens. The refusal comes from the server, so opening the
// admin URL directly, or calling this with curl, is refused exactly the same
// way as clicking the button in the interface. The allowlist is enforced
// independently again by the admin_allowlist_guard trigger in the database
// (supabase/migrations/020_admin_allowlist.sql), which applies even to this
// service-role connection — so a mistake here still cannot mint an admin.
//
// Seats are capped at 3, enforced by the admin_seat_cap trigger.
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
  const email = (user.email || "").toLowerCase();

  // Already an admin — nothing to grant, just confirm.
  const { data: existingAdmin } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingAdmin) {
    res.status(200).json({ granted: true, alreadyAdmin: true });
    return;
  }

  // THE GATE. Everything above this line is identity; this is authority.
  const { data: allowed, error: allowErr } = await supabaseAdmin
    .from("admin_allowed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (allowErr) {
    res.status(500).json({ error: "query_failed", message: allowErr.message });
    return;
  }
  if (!allowed) {
    console.warn("[claim-bootstrap-admin] refused non-allowlisted account", email);
    res.status(403).json({
      granted: false,
      reason: "not_authorised",
      message: "This account is not authorised to access the admin dashboard.",
    });
    return;
  }

  const { error: insertErr } = await supabaseAdmin
    .from("admin_profiles")
    .insert({ id: user.id, full_name: user.user_metadata?.full_name || null });

  if (insertErr) {
    // The seat-cap and allowlist triggers both surface as insert errors.
    // Report the cap distinctly so the interface can say something useful.
    const seatsFull = /seat cap/i.test(insertErr.message || "");
    res.status(seatsFull ? 409 : 500).json({
      granted: false,
      reason: seatsFull ? "seats_full" : "grant_failed",
      message: seatsFull
        ? "All 3 admin seats are in use. An existing admin must be removed first."
        : insertErr.message,
    });
    return;
  }

  res.status(200).json({ granted: true });
}
