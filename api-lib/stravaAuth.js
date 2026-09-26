// Returns a valid Strava access token for this member, refreshing it first
// if it's expired or about to be (a 5-minute buffer, so a slow request
// never straddles the exact expiry moment). Strava rotates the refresh
// token every time it's used, so the write below only replaces the token
// we just read — if two requests ever raced and one already refreshed,
// the other's write becomes a no-op instead of overwriting the newer one
// with a stale one.
export async function getValidStravaAccessToken(supabaseAdmin, userId) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile?.strava_refresh_token) return null;

  const expiresAt = profile.strava_token_expires_at ? new Date(profile.strava_token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 5 * 60 * 1000) return profile.strava_access_token;

  const res = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: profile.strava_refresh_token,
    }),
  });
  if (!res.ok) {
    console.error("[stravaAuth] refresh failed", res.status);
    return null;
  }
  const data = await res.json();

  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      strava_access_token: data.access_token,
      strava_refresh_token: data.refresh_token,
      strava_token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq("id", userId)
    .eq("strava_refresh_token", profile.strava_refresh_token);
  if (updateErr) console.error("[stravaAuth] token update failed", updateErr);

  return data.access_token;
}
