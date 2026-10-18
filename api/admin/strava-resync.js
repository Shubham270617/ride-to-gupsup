import { requireAdmin } from "../../api-lib/requireAdmin.js";
import { advanceStravaBackfill, resetStravaBackfill } from "../../api-lib/stravaSync.js";

// POST /api/admin/strava-resync  { userId?: string }
//
// Re-walks a member's Strava history from scratch (or every connected
// member, if no userId is given) without waiting for the nightly cron.
// This is the manual lever for "the numbers still look wrong" — clearing
// the watermark makes the walk start again at today and page all the way
// back to their first ever activity.
//
// Re-walking is safe to do at any time: activities upsert on
// strava_activity_id, so a second pass rewrites what is already there and
// picks up anything that was missed, rather than duplicating it.
//
// Admin-only, verified server-side against the email allowlist — a member
// who found this URL gets a 403, not a resync.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }
  const { supabaseAdmin } = auth;

  const userId = req.body?.userId || req.query?.userId;

  let targets;
  if (userId) {
    targets = [{ id: userId }];
  } else {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .not("strava_refresh_token", "is", null);
    if (error) {
      res.status(500).json({ error: "query_failed", message: error.message });
      return;
    }
    targets = data || [];
  }

  // Clear every watermark up front, so even the members this request runs
  // out of time for are queued for the cron to finish.
  for (const t of targets) {
    try {
      await resetStravaBackfill(supabaseAdmin, t.id);
    } catch (err) {
      console.error("[admin/strava-resync] reset failed", t.id, err);
    }
  }

  // Then get as far as we can inside this request. The rest is the cron's.
  const deadline = Date.now() + 40_000;
  const results = [];
  for (const t of targets) {
    if (Date.now() > deadline) break;
    try {
      const { done, fetched } = await advanceStravaBackfill(supabaseAdmin, t.id, { deadline });
      results.push({ userId: t.id, fetched, done });
    } catch (err) {
      console.error("[admin/strava-resync] member failed", t.id, err);
      results.push({ userId: t.id, error: err.message });
    }
  }

  res.status(200).json({ queued: targets.length, advanced: results.length, results });
}
