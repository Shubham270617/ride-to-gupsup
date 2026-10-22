import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { syncNewActivities } from "./stravaSync.js";

// POST /api/auth/account?op=strava-refresh — Authorization: Bearer <session>
//
// Called by the site (src/lib/useStravaRefresh.js) when a member who has
// Strava connected opens it: pulls in any rides they recorded since we last
// looked, so a new ride shows up without waiting for the webhook, the
// nightly job, or an admin's Resync. A member can only refresh their own
// account, and at most once every 10 minutes — Strava's API allowance is
// shared by everyone, so a member reloading the page can't burn it.
//
// Answers { fetched } with how many activities came in, or
// { skipped: "not_connected" | "recent" }.
export const REFRESH_EVERY_MS = 10 * 60 * 1000;

export default async function stravaRefresh(req, res) {
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
  const userId = userData.user.id;

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("strava_refresh_token, strava_checked_at, strava_backfill_done")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    console.error("[strava-refresh] profile read failed", profileErr);
    res.status(500).json({ error: "profile_read_failed" });
    return;
  }
  if (!profile?.strava_refresh_token) {
    res.status(200).json({ skipped: "not_connected" });
    return;
  }
  const checkedAt = profile.strava_checked_at ? new Date(profile.strava_checked_at).getTime() : 0;
  if (Date.now() - checkedAt < REFRESH_EVERY_MS) {
    res.status(200).json({ skipped: "recent" });
    return;
  }

  try {
    const result = await syncNewActivities(supabaseAdmin, userId, { maxPages: 2, deadline: Date.now() + 8_000 });
    res.status(200).json(result);
  } catch (err) {
    console.error("[strava-refresh] failed", userId, err);
    res.status(502).json({ error: "strava_failed" });
  }
}
