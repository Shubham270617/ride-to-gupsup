import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { syncOneActivity, deleteOneActivity } from "../../api-lib/stravaSync.js";

// Strava calls this endpoint two different ways:
//  - GET, once, when the push subscription is first registered (see
//    scripts/register-strava-webhook.mjs) — proves we really control this
//    URL before Strava starts sending it real events.
//  - POST, every time something happens on a connected athlete's account.
//
// The whole POST handler is awaited before responding — not "respond fast,
// then keep working in the background" — because a serverless function's
// execution can be frozen the moment its response is sent, so code placed
// after res.json() isn't reliably guaranteed to finish. A single
// activity fetch + two small writes finishes in well under a second, so
// awaiting it is still comfortably inside Strava's timeout. If activity
// volume ever grows large enough for that to stop being true, this is the
// point to split into a queue + background worker instead.
export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    // The env check matters: unset, `undefined === undefined` would pass
    // for any request that simply leaves hub.verify_token out.
    const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && expected && token === expected) {
      res.status(200).json({ "hub.challenge": challenge });
    } else {
      res.status(403).json({ error: "verification_failed" });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  try {
    const { object_type, object_id, aspect_type, owner_id } = req.body || {};
    if (object_type !== "activity") {
      res.status(200).json({ received: true });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      // Misconfiguration, not a bad event — fail loudly so Strava redelivers
      // once the env is fixed, rather than silently dropping the activity.
      console.error("[webhooks/strava] supabase admin unavailable");
      res.status(500).json({ error: "server_misconfigured" });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("strava_athlete_id", owner_id)
      .maybeSingle();

    if (profile) {
      if (aspect_type === "delete") {
        await deleteOneActivity(supabaseAdmin, profile.id, object_id);
      } else {
        await syncOneActivity(supabaseAdmin, profile.id, object_id);
      }
    }
    // No matching profile just means this event is for an athlete we
    // don't have connected (or they've since disconnected) — nothing to
    // do, but still acknowledge so Strava doesn't retry it.

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhooks/strava] failed", err);
    // Ask Strava to redeliver. This used to acknowledge with a 200 to avoid
    // wasting rate-limit budget on permanent failures — but the common case
    // here is transient (a token refresh blip, a brief database error), and
    // swallowing it loses that activity permanently with nothing to go back
    // for it. A retried event is idempotent: activities upsert on
    // strava_activity_id, so a redelivery costs one request and changes
    // nothing if the first attempt actually succeeded.
    res.status(500).json({ error: "sync_failed" });
  }
}
