import { useEffect } from "react";
import { isSupabaseConfigured } from "./supabaseClient";
import useSession from "./useSession";
import { announceStravaSynced } from "./stravaEvents";

// When a signed-in member opens the site, asks the server to pull in any
// Strava rides they've recorded since we last looked
// (api-lib/stravaRefresh.js). The server only does real work for members
// with Strava connected, and at most every 10 minutes; this also remembers
// the last ask per browser tab so moving between pages doesn't repeat it.
const ASK_EVERY_MS = 10 * 60 * 1000;
const askedKey = (userId) => `rtg_strava_refresh_${userId}`;

function askedRecently(userId) {
  try {
    return Date.now() - Number(window.sessionStorage.getItem(askedKey(userId)) || 0) < ASK_EVERY_MS;
  } catch {
    return false;
  }
}

function markAsked(userId) {
  try {
    window.sessionStorage.setItem(askedKey(userId), String(Date.now()));
  } catch {
    /* storage blocked — the server still limits it */
  }
}

export default function useStravaRefresh() {
  const { session, user } = useSession();
  const userId = user?.id;
  const token = session?.access_token;

  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !token || askedRecently(userId)) return;
    markAsked(userId);
    fetch("/api/auth/account?op=strava-refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.fetched > 0) announceStravaSynced();
      })
      .catch(() => {
        /* offline or server down — the webhook and nightly sync still run */
      });
  }, [userId, token]);
}
