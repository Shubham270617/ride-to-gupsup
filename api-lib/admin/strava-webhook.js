import { requireAdmin } from "../requireAdmin.js";
import { siteUrl } from "../emailLayout.js";

// /api/admin/strava-webhook — Admin → Members → "Strava live updates".
//
// Strava pushes every new, edited or deleted activity to
// api/webhooks/strava.js the moment it happens — but only once RTG's Strava
// app has a "push subscription" pointing at that address. This used to be a
// script a developer ran by hand (scripts/register-strava-webhook.mjs); this
// lets an admin check it and switch it on from the dashboard instead.
//
//   GET   status: are the Vercel settings present, and is a subscription
//         registered, to which address?
//   POST  register one for this site. An existing subscription pointing
//         somewhere else (Strava allows only one per app) is removed first.
//
// Admin-only. The client secret never leaves the server.
const PUSH_URL = "https://www.strava.com/api/v3/push_subscriptions";

function settings() {
  return {
    clientId: process.env.STRAVA_CLIENT_ID || "",
    clientSecret: process.env.STRAVA_CLIENT_SECRET || "",
    verifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "",
  };
}

const missingSettings = ({ clientId, clientSecret, verifyToken }) =>
  [
    !clientId && "STRAVA_CLIENT_ID",
    !clientSecret && "STRAVA_CLIENT_SECRET",
    !verifyToken && "STRAVA_WEBHOOK_VERIFY_TOKEN",
  ].filter(Boolean);

async function listSubscriptions({ clientId, clientSecret }) {
  const res = await fetch(`${PUSH_URL}?${new URLSearchParams({ client_id: clientId, client_secret: clientSecret })}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.message || `Strava answered ${res.status}`), { status: res.status });
  return Array.isArray(body) ? body : [];
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const config = settings();
  const callbackUrl = `${siteUrl(req)}/api/webhooks/strava`;
  const missing = missingSettings(config);
  if (missing.length) {
    res.status(200).json({ live: false, missing, callbackUrl });
    return;
  }

  try {
    let subscriptions = await listSubscriptions(config);
    let current = subscriptions[0] || null;

    if (req.method === "POST" && current?.callback_url !== callbackUrl) {
      if (current) {
        const del = await fetch(
          `${PUSH_URL}/${current.id}?${new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret })}`,
          { method: "DELETE" }
        );
        if (!del.ok && del.status !== 404) throw new Error(`Couldn't remove the old subscription (Strava answered ${del.status})`);
      }
      // Strava calls api/webhooks/strava.js straight away to check the
      // verify token, so this only succeeds once that code and the same
      // STRAVA_WEBHOOK_VERIFY_TOKEN are live at callbackUrl.
      const created = await fetch(PUSH_URL, {
        method: "POST",
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          callback_url: callbackUrl,
          verify_token: config.verifyToken,
        }),
      });
      const body = await created.json().catch(() => null);
      if (!created.ok) {
        const reason = body?.errors?.map((e) => [e.field, e.code].filter(Boolean).join(" ")).join(", ") || body?.message;
        throw new Error(`Strava refused the subscription${reason ? ` (${reason})` : ""} — check that this site is deployed and STRAVA_WEBHOOK_VERIFY_TOKEN is set in Vercel.`);
      }
      subscriptions = await listSubscriptions(config);
      current = subscriptions[0] || null;
    }

    res.status(200).json({
      live: current?.callback_url === callbackUrl,
      missing: [],
      callbackUrl,
      subscription: current ? { id: current.id, callbackUrl: current.callback_url, createdAt: current.created_at } : null,
    });
  } catch (err) {
    console.error("[admin/strava-webhook]", err);
    res.status(502).json({ error: "strava_failed", message: err.message });
  }
}
