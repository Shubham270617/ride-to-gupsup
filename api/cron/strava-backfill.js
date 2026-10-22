import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { advanceStravaBackfill, syncNewActivities } from "../../api-lib/stravaSync.js";

// How many members to pick up in a single invocation. The job only runs
// once a day (Vercel Hobby), so it takes a generous batch; the time budget
// below still stops it cleanly, and anyone it doesn't reach waits for the
// next run — their watermarks mean nothing is lost by waiting.
const MEMBERS_PER_RUN = 25;

// Members whose history is complete, checked for new rides in the same run
// (about one Strava request each when nothing is new).
const NEW_ACTIVITY_MEMBERS_PER_RUN = 60;

// Leave headroom before the platform kills the function. Every page is
// committed to the watermark as it lands, so being cut off early is safe —
// the next run resumes from exactly where this one stopped. This budget
// just makes the stop tidy rather than abrupt.
const TIME_BUDGET_MS = 45_000;

// Walks connected members' full Strava history, a chunk at a time, until
// every one of them is caught up.
//
// Why this exists: webhooks only deliver activity recorded AFTER a member
// connects, and the connect-time backfill is deliberately tiny so it can
// finish inside the OAuth redirect. Everything older than that — which for
// a long-time rider is the overwhelming majority of their distance — only
// arrives through this job. See api-lib/stravaSync.js.
//
// Also callable by hand for a single member:
//   POST /api/cron/strava-backfill?userId=<uuid>
// which is what the admin "Resync" action uses.
export default async function handler(req, res) {
  // Unconditional, unlike the older purge-media job: an unauthenticated
  // trigger here would let anyone burn our Strava API rate limit.
  if (!process.env.CRON_SECRET) {
    console.error("[cron/strava-backfill] CRON_SECRET is not set — refusing to run");
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }
  if ((req.headers.authorization || "") !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  const onlyUserId = req.query?.userId;

  let pending;
  if (onlyUserId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", onlyUserId)
      .not("strava_refresh_token", "is", null)
      .limit(1);
    if (error) {
      res.status(500).json({ error: "query_failed", message: error.message });
      return;
    }
    pending = data || [];
  } else {
    // Oldest watermark first, so a member who has never been walked (null)
    // is picked up before one that is already partway through.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("strava_backfill_done", false)
      .not("strava_refresh_token", "is", null)
      .order("strava_synced_through", { ascending: true, nullsFirst: true })
      .limit(MEMBERS_PER_RUN);
    if (error) {
      res.status(500).json({ error: "query_failed", message: error.message });
      return;
    }
    pending = data || [];
  }

  const results = [];
  for (const member of pending) {
    if (Date.now() > deadline) break;
    try {
      const { done, fetched } = await advanceStravaBackfill(supabaseAdmin, member.id, { deadline });
      results.push({ userId: member.id, fetched, done });
    } catch (err) {
      // One member's failure must not stop the others — a revoked Strava
      // token or a rate limit on their account is their problem alone.
      console.error("[cron/strava-backfill] member failed", member.id, err);
      results.push({ userId: member.id, error: err.message });
    }
  }

  // Then, with the time left: new rides for members whose history is
  // complete. The walk above never looks at them again, so without this a
  // missed webhook meant a ride never arrived. Longest-unchecked first, so
  // anyone not reached tonight is first in line tomorrow.
  const newActivities = [];
  if (!onlyUserId && Date.now() < deadline) {
    const { data: caughtUp, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("strava_backfill_done", true)
      .not("strava_refresh_token", "is", null)
      .order("strava_checked_at", { ascending: true, nullsFirst: true })
      .limit(NEW_ACTIVITY_MEMBERS_PER_RUN);
    if (error) console.error("[cron/strava-backfill] new-activity query failed", error);
    for (const member of caughtUp || []) {
      if (Date.now() > deadline) break;
      try {
        const { fetched, rateLimited } = await syncNewActivities(supabaseAdmin, member.id, { deadline });
        newActivities.push({ userId: member.id, fetched });
        if (rateLimited) break;
      } catch (err) {
        console.error("[cron/strava-backfill] new-activity sync failed", member.id, err);
        newActivities.push({ userId: member.id, error: err.message });
      }
    }
  }

  res.status(200).json({ processed: results.length, results, newActivities });
}
