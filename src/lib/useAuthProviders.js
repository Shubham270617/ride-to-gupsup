import { useEffect, useState } from "react";

// GET /api/auth/providers -> { strava: true, xfitconnect: false } — lets a
// "Continue with X" / "Connect X" button know whether that provider is
// actually configured server-side, instead of assuming it always is and
// showing a broken button the moment credentials are missing or rotated.
export default function useAuthProviders() {
  const [providers, setProviders] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled) setProviders(data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return providers;
}
