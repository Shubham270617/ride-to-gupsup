import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { destroyCloudinaryAsset } from "../../api-lib/cloudinaryDestroy.js";

// POST /api/cloudinary/delete — called when an admin explicitly deletes a
// photo (Site Photos' Delete button, Gallery's trash icon). Verifies the
// caller is a real admin, then destroys the asset on Cloudinary immediately.
// The browser never gets the API secret — same pattern as sign.js.
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

  const { data: adminRow } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!adminRow) {
    res.status(403).json({ error: "not_admin" });
    return;
  }

  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "missing_url" });
    return;
  }

  try {
    await destroyCloudinaryAsset(url);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "delete_failed", message: err.message });
  }
}
