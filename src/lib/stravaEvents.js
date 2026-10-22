import { useEffect, useState } from "react";

// Fired on window when new Strava activities have just been pulled in for
// the signed-in member (src/lib/useStravaRefresh.js), so anything showing
// Strava numbers can read them again instead of waiting for a page reload.
export const STRAVA_SYNCED_EVENT = "rtg:strava-synced";

export function announceStravaSynced() {
  window.dispatchEvent(new Event(STRAVA_SYNCED_EVENT));
}

// A number that goes up each time new activities arrive — put it in a data
// hook's effect dependencies to re-read.
export function useStravaSyncedTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(STRAVA_SYNCED_EVENT, bump);
    return () => window.removeEventListener(STRAVA_SYNCED_EVENT, bump);
  }, []);
  return tick;
}
