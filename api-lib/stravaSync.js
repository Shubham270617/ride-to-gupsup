import { getValidStravaAccessToken } from "./stravaAuth.js";

// Strava's maximum allowed page size. Using anything smaller just means
// more round trips for the same data — and more chances to hit the
// per-15-minute rate limit mid-backfill.
const STRAVA_PAGE_SIZE = 200;

// How many rows we read back at a time when recomputing totals. PostgREST
// caps a single select at the project's db-max-rows (1000 by default), so
// a member with more activities than that has to be read in pages or the
// total silently comes out short — which is the exact class of bug this
// whole module exists to fix.
const READ_PAGE_SIZE = 1000;

function mapActivity(a) {
  return {
    strava_activity_id: a.id,
    type: a.type,
    name: a.name,
    distance_meters: a.distance,
    moving_time_seconds: a.moving_time,
    elevation_gain_meters: a.total_elevation_gain,
    average_speed: a.average_speed,
    start_date: a.start_date,
    raw_data: a,
    updated_at: new Date().toISOString(),
  };
}

// Writes a batch of activities.
//
// onConflict MUST name strava_activity_id. Without it PostgREST infers the
// conflict target from the primary key (id), and since these rows carry no
// id a fresh uuid is generated every time — so the PK never conflicts and
// the pre-existing strava_activity_id UNIQUE raises 23505 instead. That
// error used to be discarded (the result wasn't destructured), which meant
// re-syncing an athlete silently wrote nothing at all and their totals
// could never be repaired. Both are fixed here: conflict on the real
// natural key, and surface the error.
async function upsertActivities(supabaseAdmin, rows) {
  if (!rows.length) return;
  const { error } = await supabaseAdmin
    .from("strava_activities")
    .upsert(rows, { onConflict: "strava_activity_id" });
  if (error) {
    console.error("[stravaSync] upsert failed", error);
    throw error;
  }
}

// Recomputes one member's public leaderboard row from their real,
// private activity rows — called after every activity add/update/delete
// so the public totals can never drift from the detailed data behind them.
// full_name/avatar_url are copied in here (server-side, bypassing RLS) so
// the public leaderboard never needs read access to the profiles table
// itself — see the comment on leaderboard_stats in schema.sql.
export async function recomputeLeaderboard(supabaseAdmin, userId) {
  const totals = { total_distance_meters: 0, total_moving_time_seconds: 0, activity_count: 0 };

  // Paged read: a fully backfilled athlete can easily exceed db-max-rows.
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("strava_activities")
      .select("distance_meters, moving_time_seconds")
      .eq("user_id", userId)
      .order("start_date", { ascending: true })
      .range(from, from + READ_PAGE_SIZE - 1);
    if (error) {
      console.error("[stravaSync] leaderboard read failed", error);
      throw error;
    }
    for (const a of data || []) {
      totals.total_distance_meters += Number(a.distance_meters || 0);
      totals.total_moving_time_seconds += Number(a.moving_time_seconds || 0);
      totals.activity_count += 1;
    }
    if (!data || data.length < READ_PAGE_SIZE) break;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const { error: writeErr } = await supabaseAdmin.from("leaderboard_stats").upsert({
    user_id: userId,
    full_name: profile?.full_name || null,
    avatar_url: profile?.avatar_url || null,
    ...totals,
    updated_at: new Date().toISOString(),
  });
  if (writeErr) {
    console.error("[stravaSync] leaderboard write failed", writeErr);
    throw writeErr;
  }
}

// Fetches one activity by id and upserts it — this is what the webhook
// calls for a "create" or "update" event on a single activity.
export async function syncOneActivity(supabaseAdmin, userId, stravaActivityId) {
  const token = await getValidStravaAccessToken(supabaseAdmin, userId);
  if (!token) return;
  const res = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[stravaSync] activity fetch failed", stravaActivityId, res.status);
    throw new Error(`strava activity fetch ${res.status}`);
  }
  const activity = await res.json();
  await upsertActivities(supabaseAdmin, [{ user_id: userId, ...mapActivity(activity) }]);
  await recomputeLeaderboard(supabaseAdmin, userId);
}

// Removes one activity — the webhook's "delete" event. Scoped by user_id as
// well as activity id: strava_activity_id is globally unique today, but
// scoping the delete to its owner means a bad or spoofed owner_id in a
// webhook payload can't reach another member's row.
export async function deleteOneActivity(supabaseAdmin, userId, stravaActivityId) {
  const { error } = await supabaseAdmin
    .from("strava_activities")
    .delete()
    .eq("user_id", userId)
    .eq("strava_activity_id", stravaActivityId);
  if (error) {
    console.error("[stravaSync] delete failed", error);
    throw error;
  }
  await recomputeLeaderboard(supabaseAdmin, userId);
}

// ---------------------------------------------------------------------------
// Full-history backfill
// ---------------------------------------------------------------------------
// Webhooks only ever fire for NEW activity, so everything a member recorded
// before they connected has to be pulled in explicitly. This used to be
// capped at two pages of 30 (60 activities, ever) to fit inside the OAuth
// redirect — which is why an athlete with 5,000+ km showed ~539 km: their
// 60 most recent rides and nothing else, with no mechanism that would ever
// go back for the rest.
//
// It is now a resumable walk over the member's ENTIRE history. We page
// backwards in time using Strava's `before` cursor, persisting how far back
// we've reached after every page, so an invocation that runs out of time
// simply picks up where it left off on the next run instead of starting
// over. api/cron/strava-backfill.js drives it to completion.
//
// Why `before` rather than page=1..N: deep `page` offsets on a long history
// are both slow and fragile (a newly recorded activity shifts every page
// boundary underneath us, which silently skips rows). A time cursor is
// stable regardless of what gets added while the walk is in progress.

function epochSeconds(value) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Math.floor(ms / 1000);
}

// Advances one member's backfill by at most `maxPages` pages (or until the
// time budget runs out). Returns { done, fetched } so the caller can decide
// whether to keep going.
export async function advanceStravaBackfill(
  supabaseAdmin,
  userId,
  { maxPages = 10, deadline = Date.now() + 40_000 } = {}
) {
  const token = await getValidStravaAccessToken(supabaseAdmin, userId);
  if (!token) return { done: false, fetched: 0 };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("strava_synced_through, strava_backfill_done")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.strava_backfill_done) return { done: true, fetched: 0 };

  // Resume from where the last run stopped, or start at "now" for a member
  // who has never been walked.
  let cursor = profile?.strava_synced_through
    ? epochSeconds(profile.strava_synced_through)
    : epochSeconds(Date.now());

  let fetched = 0;
  let done = false;
  let rateLimited = false;

  for (let page = 0; page < maxPages; page++) {
    if (Date.now() > deadline) break;

    const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${STRAVA_PAGE_SIZE}&before=${cursor}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 429) {
      // Rate limited — stop cleanly and let the next run resume. The
      // watermark is already persisted, so nothing is lost or re-fetched.
      console.warn("[stravaSync] rate limited, pausing backfill for", userId);
      rateLimited = true;
      break;
    }
    if (!res.ok) {
      console.error("[stravaSync] backfill fetch failed", res.status);
      break;
    }

    const activities = await res.json();
    if (!Array.isArray(activities) || activities.length === 0) {
      // Walked past the member's very first activity — history complete.
      done = true;
      break;
    }

    await upsertActivities(
      supabaseAdmin,
      activities.map((a) => ({ user_id: userId, ...mapActivity(a) }))
    );
    fetched += activities.length;

    // Strava returns these newest-first, so the last one is the oldest in
    // this batch. Step the cursor one second past it so the same activity
    // isn't handed back forever (`before` is inclusive).
    const oldest = activities[activities.length - 1];
    const oldestEpoch = epochSeconds(oldest.start_date);
    cursor = Number.isFinite(oldestEpoch) ? oldestEpoch - 1 : cursor - 1;

    await supabaseAdmin
      .from("profiles")
      .update({ strava_synced_through: new Date(cursor * 1000).toISOString() })
      .eq("id", userId);

    // Only an EMPTY page (above) ends the walk. A short page used to count
    // as "reached the first activity", but Strava can return fewer than
    // per_page while older activities still exist — and since the member is
    // then marked done for good, everything older was never fetched. One
    // extra request per member is the price of never stopping early.
  }

  if (done) {
    await supabaseAdmin.from("profiles").update({ strava_backfill_done: true }).eq("id", userId);
  }

  if (fetched > 0 || done) await recomputeLeaderboard(supabaseAdmin, userId);

  return rateLimited ? { done, fetched, rateLimited } : { done, fetched };
}

// Called from the OAuth connect/login flow. Deliberately small: it grabs
// the most recent page so the member sees real numbers the moment they land
// back on their dashboard, and leaves the rest of the history to the cron.
// Failures here are logged, never thrown — a backfill hiccup must not break
// the sign-in redirect the member is in the middle of.
export async function backfillRecentActivities(supabaseAdmin, userId) {
  try {
    return await advanceStravaBackfill(supabaseAdmin, userId, {
      maxPages: 1,
      deadline: Date.now() + 8_000,
    });
  } catch (err) {
    console.error("[stravaSync] connect-time backfill failed", err);
    return { done: false, fetched: 0 };
  }
}

// ---------------------------------------------------------------------------
// New activity, without waiting for a webhook
// ---------------------------------------------------------------------------
// The backfill above only walks BACKWARDS, and stops for good once a
// member's history is complete — after that, new rides arrive only through
// the Strava webhook. If the webhook isn't registered, or Strava drops an
// event, a new ride never showed up until an admin pressed Resync.
//
// This walks FORWARDS from the newest ride we already hold: one request
// when nothing is new. It looks back a day before that ride, so a ride
// uploaded late with an earlier start time is still caught (upserts make the
// overlap harmless). Used by the member's own refresh when they open the
// site (api-lib/stravaRefresh.js) and by the nightly job.
const LOOKBACK_SECONDS = 24 * 60 * 60;
const FIRST_LOOK_SECONDS = 30 * 24 * 60 * 60;

export async function syncNewActivities(
  supabaseAdmin,
  userId,
  { maxPages = 5, deadline = Date.now() + 20_000 } = {}
) {
  const token = await getValidStravaAccessToken(supabaseAdmin, userId);
  if (!token) return { fetched: 0 };

  const { data: newest } = await supabaseAdmin
    .from("strava_activities")
    .select("start_date")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let cursor = newest?.start_date
    ? epochSeconds(newest.start_date) - LOOKBACK_SECONDS
    : epochSeconds(Date.now()) - FIRST_LOOK_SECONDS;

  let fetched = 0;
  let rateLimited = false;

  for (let page = 0; page < maxPages; page++) {
    if (Date.now() > deadline) break;

    const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${STRAVA_PAGE_SIZE}&after=${cursor}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      console.warn("[stravaSync] rate limited, pausing new-activity sync for", userId);
      rateLimited = true;
      break;
    }
    if (!res.ok) {
      console.error("[stravaSync] new-activity fetch failed", res.status);
      break;
    }

    const activities = await res.json();
    if (!Array.isArray(activities) || activities.length === 0) break;

    await upsertActivities(
      supabaseAdmin,
      activities.map((a) => ({ user_id: userId, ...mapActivity(a) }))
    );
    fetched += activities.length;

    // Step past the newest one in this batch (whatever order Strava used).
    // `after` is exclusive; the guard stops a malformed date looping forever.
    const newestEpoch = Math.max(...activities.map((a) => epochSeconds(a.start_date)).filter(Number.isFinite));
    if (!Number.isFinite(newestEpoch) || newestEpoch <= cursor) break;
    cursor = newestEpoch;
  }

  await supabaseAdmin.from("profiles").update({ strava_checked_at: new Date().toISOString() }).eq("id", userId);
  if (fetched > 0) await recomputeLeaderboard(supabaseAdmin, userId);

  return rateLimited ? { fetched, rateLimited } : { fetched };
}

// Forces a member's history to be walked again from scratch — the admin
// "Resync" action. Clearing the watermark is enough; the upserts are
// idempotent, so the walk simply rewrites what it already has and picks up
// anything that was missed.
export async function resetStravaBackfill(supabaseAdmin, userId) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ strava_synced_through: null, strava_backfill_done: false })
    .eq("id", userId);
  if (error) throw error;
}
