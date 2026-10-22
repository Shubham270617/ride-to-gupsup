import { requireAdmin } from "../requireAdmin.js";
import { advanceStravaBackfill, resetStravaBackfill } from "../stravaSync.js";

// POST /api/admin/strava-resync  { userId?: string, mode?: "restart" | "continue" }
//
// The admin "Resync Strava" button (Admin → Members). Walks members' full
// Strava history without waiting for the daily cron.
//
//   mode "restart" (default)  clears the watermark (one member, or every
//                             connected member) so the walk starts again at
//                             today, then gets as far as it can.
//   mode "continue"           doesn't reset anything; just advances the
//                             members whose walk isn't finished yet.
//
// One request only has ~40 seconds, so the button calls "restart" once and
// then "continue" repeatedly until `remaining` reaches 0 — a full catch-up
// takes minutes instead of days of daily cron runs.
//
// Re-walking is safe to do at any time: activities upsert on
// strava_activity_id, so a second pass rewrites what is already there and
// picks up anything that was missed, rather than duplicating it.
//
// Admin-only, verified server-side (one of the 3 admin seats) — a member
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
  const mode = (req.body?.mode || req.query?.mode) === "continue" ? "continue" : "restart";

  let targets;
  if (userId) {
    targets = [{ id: userId }];
  } else {
    let query = supabaseAdmin.from("profiles").select("id").not("strava_refresh_token", "is", null);
    // Continuing: only the unfinished walks, the least advanced first.
    if (mode === "continue") {
      query = query.eq("strava_backfill_done", false).order("strava_synced_through", { ascending: false, nullsFirst: true });
    }
    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "query_failed", message: error.message });
      return;
    }
    targets = data || [];
  }

  // Restarting: clear every watermark up front, so even the members this
  // request runs out of time for are queued for the next call (or the cron).
  if (mode === "restart") {
    for (const t of targets) {
      try {
        await resetStravaBackfill(supabaseAdmin, t.id);
      } catch (err) {
        console.error("[admin/strava-resync] reset failed", t.id, err);
      }
    }
  }

  // Then get as far as we can inside this request.
  const deadline = Date.now() + 40_000;
  const results = [];
  let rateLimited = false;
  for (const t of targets) {
    if (Date.now() > deadline || rateLimited) break;
    try {
      const result = await advanceStravaBackfill(supabaseAdmin, t.id, { deadline });
      results.push({ userId: t.id, fetched: result.fetched, done: result.done });
      if (result.rateLimited) rateLimited = true;
    } catch (err) {
      console.error("[admin/strava-resync] member failed", t.id, err);
      results.push({ userId: t.id, error: err.message });
    }
  }

  // How many connected members still have an unfinished walk — the button
  // keeps calling "continue" until this is 0.
  const { count: remaining } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("strava_refresh_token", "is", null)
    .eq("strava_backfill_done", false);

  res.status(200).json({
    queued: targets.length,
    advanced: results.length,
    results,
    remaining: remaining ?? null,
    rateLimited,
  });
}

