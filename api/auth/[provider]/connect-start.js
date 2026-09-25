import { randomBytes, createHmac } from "node:crypto";
import { providers, isProviderConfigured } from "../../../api-lib/providers.js";
import { serializeCookie } from "../../../api-lib/cookies.js";
import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";

// POST /api/auth/:provider/connect-start — called (with the caller's own
// Supabase access token) by a member who is ALREADY logged in and wants to
// link a provider account to their existing profile, e.g. Dashboard's
// "Connect Strava" button. This is deliberately separate from start.js
// (plain login/signup): if it reused that flow, clicking "Connect" while
// already logged in as you@email.com could silently switch your session to
// a different account instead of attaching Strava to the one you're on.
//
// The fix: sign the connecting member's id into a cookie here, where we've
// just verified their bearer token — callback.js later checks that
// signature before trusting it, so a tampered cookie can't be used to link
// a Strava account onto someone else's profile.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const provider = req.query.provider || req.params?.provider;
  const config = providers[provider];
  if (!config) {
    res.status(404).json({ error: "unknown_provider" });
    return;
  }
  if (!isProviderConfigured(provider)) {
    res.status(400).json({ error: "not_configured" });
    return;
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }

  const state = randomBytes(16).toString("hex");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${req.headers.host}/api/auth/${provider}/callback`;

  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", config.scope);
  authorizeUrl.searchParams.set("state", state);
  for (const [key, value] of Object.entries(config.extraAuthorizeParams || {})) {
    authorizeUrl.searchParams.set(key, value);
  }

  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = `${state}.${userData.user.id}.${expiresAt}`;
  const signature = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY).update(payload).digest("hex");

  res.setHeader("Set-Cookie", [
    serializeCookie("oauth_state", state, { maxAge: 600 }),
    serializeCookie("oauth_connect", `${userData.user.id}.${expiresAt}.${signature}`, { maxAge: 600 }),
  ]);
  res.status(200).json({ url: authorizeUrl.toString() });
}
