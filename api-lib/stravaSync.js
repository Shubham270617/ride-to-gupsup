import { getValidStravaAccessToken } from "./stravaAuth.js";

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

// Recomputes one member's public leaderboard row from their real,
// private activity rows — called after every activity add/update/delete
// so the public totals can never drift from the detailed data behind them.
// full_name/avatar_url are copied in here (server-side, bypassing RLS) so
// the public leaderboard never needs read access to the profiles table
// itself — see the comment on leaderboard_stats in schema.sql.
export async function recomputeLeaderboard(supabaseAdmin, userId) {
  const [{ data: activities }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("strava_activities").select("distance_meters, moving_time_seconds").eq("user_id", userId),
    supabaseAdmin.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
  ]);

  const totals = (activities || []).reduce(
    (acc, a) => ({
      total_distance_meters: acc.total_distance_meters + Number(a.distance_meters || 0),
      total_moving_time_seconds: acc.total_moving_time_seconds + Number(a.moving_time_seconds || 0),
      activity_count: acc.activity_count + 1,
    }),
    { total_distance_meters: 0, total_moving_time_seconds: 0, activity_count: 0 }
  );

  await supabaseAdmin.from("leaderboard_stats").upsert({
    user_id: userId,
    full_name: profile?.full_name || null,
    avatar_url: profile?.avatar_url || null,
    ...totals,
    updated_at: new Date().toISOString(),
  });
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
    return;
  }
  const activity = await res.json();
  await supabaseAdmin.from("strava_activities").upsert({ user_id: userId, ...mapActivity(activity) });
  await recomputeLeaderboard(supabaseAdmin, userId);
}

// Removes one activity — the webhook's "delete" event.
export async function deleteOneActivity(supabaseAdmin, userId, stravaActivityId) {
  await supabaseAdmin.from("strava_activities").delete().eq("strava_activity_id", stravaActivityId);
  await recomputeLeaderboard(supabaseAdmin, userId);
}

// One-time historical pull, run right after a member connects — webhooks
// only fire for NEW activity going forward, so without this their profile
// and the leaderboard would stay at zero until they record something new.
// Bounded to a couple of pages so it finishes comfortably inside the
// connect flow's redirect instead of needing its own background job.
export async function backfillRecentActivities(supabaseAdmin, userId, { pages = 2, perPage = 30 } = {}) {
  const token = await getValidStravaAccessToken(supabaseAdmin, userId);
  if (!token) return;

  for (let page = 1; page <= pages; page++) {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("[stravaSync] backfill fetch failed", res.status);
      break;
    }
    const activities = await res.json();
    if (!activities.length) break;
    const rows = activities.map((a) => ({ user_id: userId, ...mapActivity(a) }));
    await supabaseAdmin.from("strava_activities").upsert(rows);
    if (activities.length < perPage) break;
  }

  await recomputeLeaderboard(supabaseAdmin, userId);
}
