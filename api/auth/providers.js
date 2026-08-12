import { providers, isProviderConfigured } from "../lib/providers.js";

// GET /api/auth/providers -> { strava: true, xfitconnect: false }
// AuthGate.jsx calls this to know which "Continue with X" buttons are live
// vs. should show a "coming soon" state — no hardcoding on the frontend.
export default function handler(req, res) {
  const status = {};
  for (const key of Object.keys(providers)) {
    status[key] = isProviderConfigured(key);
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(status);
}
