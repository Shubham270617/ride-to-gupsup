import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { advanceStravaBackfill } from "../../api-lib/stravaSync.js";

// How many members to advance in a single invocation. Each one can take a
// few seconds of Strava round trips, so this is kept low and the rest wait
// for the next run — their watermarks mean nothing is lost by waiting.
const MEMBERS_PER_RUN = 5;

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

  res.status(200).json({ processed: results.length, results });
}
