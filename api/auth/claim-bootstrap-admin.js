import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";

// Confirm existing admin membership only. Authentication, signup, a vacant
// seat, user metadata, and visiting /admin/login do not authorize a grant.
// New admins require a separately approved, per-user provisioning action.
// This endpoint deliberately performs no writes and preserves existing admins.
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

  // Already an admin — nothing to grant, just confirm.
  const { data: existingAdmin, error: adminError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (adminError) {
    res.status(503).json({ granted: false, reason: "admin_check_failed", message: "Admin access could not be verified. Please try again later." });
    return;
  }
  if (existingAdmin) {
    res.status(200).json({ granted: true, alreadyAdmin: true });
    return;
  }

  res.status(403).json({
    granted: false,
    reason: "not_admin",
    message: "This account is not authorised to access the admin dashboard. Ask an existing administrator to arrange access.",
  });
}
