import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

// POST /api/cloudinary/sign — called by the admin dashboard before every
// upload. Verifies the caller is a real logged-in admin (via their Supabase
// access token), then hands back a short-lived signature so the browser can
// upload the file straight to Cloudinary itself (never through our server —
// keeps us out of the way of large video uploads). The Cloudinary API
// secret never leaves this function.
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

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "cloudinary_not_configured" });
    return;
  }

  const body = req.body || {};
  const folder = `rtg/${(body.folder || "uploads").replace(/[^a-zA-Z0-9/_-]/g, "-")}`;
  const timestamp = Math.round(Date.now() / 1000);

  // Only these params are part of the signature — must match exactly what
  // the browser sends to Cloudinary afterward.
  const paramsToSign = { folder, timestamp };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  res.status(200).json({ signature, timestamp, apiKey, cloudName, folder });
}
