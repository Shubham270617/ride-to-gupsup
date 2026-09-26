// Registers RTG's webhook with Strava — a ONE-TIME setup step (or a
// repeat one, if the callback domain ever changes), not something that
// runs as part of the app itself.
//
// Run this AFTER the code is deployed and live at the real domain — Strava
// immediately sends a verification GET request to the callback URL the
// moment you register, so api/webhooks/strava.js must already be reachable
// there or this will fail.
//
// Usage:
//   node scripts/register-strava-webhook.mjs
//
// Reads STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_WEBHOOK_VERIFY_TOKEN
// from api/.env.local. Uses those exact same production values — this
// only works meaningfully once they're also set in Vercel, since Strava
// calls the live site, not your machine.

import fs from "node:fs";

const envPath = new URL("../api/.env.local", import.meta.url);
const env = fs.readFileSync(envPath, "utf8");
env.split("\n").forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});

const CALLBACK_URL = "https://rideteagupshup.com/api/webhooks/strava";

async function main() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_WEBHOOK_VERIFY_TOKEN) {
    console.error("Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_WEBHOOK_VERIFY_TOKEN in api/.env.local");
    process.exit(1);
  }

  const body = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    callback_url: CALLBACK_URL,
    verify_token: STRAVA_WEBHOOK_VERIFY_TOKEN,
  });

  const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
    method: "POST",
    body,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Registration failed:", res.status, data);
    console.error(
      "\nCommon causes: the site isn't deployed with this code yet, the verify token doesn't match what's set in Vercel's env vars, or a subscription already exists (Strava allows only one per app — check with the 'view' request in their docs before retrying)."
    );
    process.exit(1);
  }

  console.log("Webhook registered! Subscription:", data);
}

main();
