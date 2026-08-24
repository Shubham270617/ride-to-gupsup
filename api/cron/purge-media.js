import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { destroyCloudinaryAsset } from "../../api-lib/cloudinaryDestroy.js";

const GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

// Runs once a day (see vercel.json crons). When an admin replaces a Site
// Photo, the old image's URL gets queued in media_pending_deletions instead
// of being destroyed on the spot — this job clears anything that's sat there
// for 2+ days, freeing Cloudinary storage without deleting a photo an admin
// might still want to revert to a few minutes after replacing it.
export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("media_pending_deletions")
    .select("id,url")
    .lte("created_at", cutoff)
    .limit(200);

  if (error) {
    res.status(500).json({ error: "query_failed", message: error.message });
    return;
  }

  let purged = 0;
  const failures = [];
  for (const row of rows || []) {
    try {
      await destroyCloudinaryAsset(row.url);
      await supabaseAdmin.from("media_pending_deletions").delete().eq("id", row.id);
      purged += 1;
    } catch (err) {
      failures.push({ id: row.id, message: err.message });
    }
  }

  res.status(200).json({ purged, failed: failures.length, failures });
}
