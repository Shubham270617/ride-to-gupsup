import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

// POST /api/cloudinary/sign-avatar — same idea as sign.js, but for any
// logged-in member uploading their own profile photo (onboarding, or later
// from the Dashboard), not just admins uploading site-wide media. The
// folder is forced to the caller's own user id — ignores whatever `folder`
// the client sends — so a member can never sign an upload into someone
// else's folder or into the admin-managed site/gallery folders.
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

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "cloudinary_not_configured" });
    return;
  }

  const folder = `rtg/avatars/${userData.user.id}`;
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = { folder, timestamp };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  res.status(200).json({ signature, timestamp, apiKey, cloudName, folder });
}
