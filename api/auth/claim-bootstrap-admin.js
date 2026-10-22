import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { isAdminAccount, isAdminEmail } from "../../api-lib/adminEmails.js";

// POST /api/auth/claim-bootstrap-admin — called right after a successful
// sign-in on /admin/login (and from the Google callback) to decide whether
// this account may enter the admin dashboard.
//
// The rule: only the 3 fixed RTG admin emails (api-lib/adminEmails.js) are
// admins. Signing in with one of them, once the email is verified, gives
// that account its admin_profiles row (if it doesn't have it yet). Every
// other account is refused with 403 "not_admin_email". The database
// enforces the same list (admin_email_guard trigger and is_admin(), see
// supabase/migrations/029_fixed_admin_emails.sql).
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

  if (!isAdminEmail(user.email)) {
    res.status(403).json({
      granted: false,
      reason: "not_admin_email",
      message: "Only the RTG admin email addresses can open the admin dashboard.",
    });
    return;
  }
  if (!isAdminAccount(user)) {
    res.status(403).json({
      granted: false,
      reason: "email_not_confirmed",
      message: "Confirm this email address first (use the link Supabase emailed you), then log in again.",
    });
    return;
  }

  // Already an admin — nothing to grant, just confirm.
  const { data: existingAdmin, error: adminErr } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (adminErr) {
    console.error("[claim-bootstrap-admin] admin_profiles lookup", adminErr);
    res.status(503).json({ granted: false, reason: "admin_check_failed", message: "Admin access could not be checked. Please try again." });
    return;
  }
  if (existingAdmin) {
    res.status(200).json({ granted: true, alreadyAdmin: true });
    return;
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;

  // admin_profiles.id has a foreign key to profiles.id, so an account with
  // no profiles row (created before the signup trigger existed, or whose
  // row was deleted by hand) could never be made an admin — the insert
  // below would fail. Make sure the row exists first; ignoreDuplicates
  // leaves an existing row untouched.
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, email: user.email, full_name: fullName }, { onConflict: "id", ignoreDuplicates: true });
  if (profileErr) {
    console.error("[claim-bootstrap-admin] profiles upsert", profileErr);
    res.status(500).json({ granted: false, reason: "grant_failed", message: profileErr.message });
    return;
  }

  const { error: insertErr } = await supabaseAdmin.from("admin_profiles").insert({ id: user.id, full_name: fullName });
  if (insertErr) {
    console.error("[claim-bootstrap-admin] admin_profiles insert", insertErr);
    res.status(500).json({ granted: false, reason: "grant_failed", message: insertErr.message });
    return;
  }

  res.status(200).json({ granted: true });
}
