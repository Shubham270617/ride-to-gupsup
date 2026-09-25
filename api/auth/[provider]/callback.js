import { createHmac, timingSafeEqual } from "node:crypto";
import { providers, isProviderConfigured } from "../../../api-lib/providers.js";
import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import { parseCookies, serializeCookie } from "../../../api-lib/cookies.js";

// Verifies the signed "oauth_connect" cookie set by connect-start.js against
// the OAuth `state` that just came back from the provider. Returns the
// connecting member's user id only if the signature matches and the ticket
// hasn't expired — a tampered or expired ticket is treated exactly like
// there being no ticket at all (falls back to ordinary login behavior
// below), never trusted partially.
function verifyConnectTicket(cookieValue, state) {
  if (!cookieValue) return null;
  const [userId, expiresAtStr, signature] = cookieValue.split(".");
  if (!userId || !expiresAtStr || !signature) return null;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return null;

  const expected = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`${state}.${userId}.${expiresAt}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return userId;
}

export default async function handler(req, res) {
  const { code, state, error: providerError } = req.query;
  // Vercel's [provider] folder convention puts this in req.query; Express's
  // :provider route param (used by the Hostinger/server.js deployment
  // target) puts it in req.params instead — support both.
  const provider = req.query.provider || req.params?.provider;
  const config = providers[provider];
  const frontend = process.env.FRONTEND_URL || "/";

  const redirectWithError = (reason) => {
    res.writeHead(302, {
      Location: `${frontend}/auth/callback?error=${reason}&provider=${provider}`,
    });
    res.end();
  };

  if (!config || !isProviderConfigured(provider)) return redirectWithError("not_configured");
  if (providerError) return redirectWithError("access_denied");

  const cookies = parseCookies(req.headers.cookie);
  if (!state || !cookies.oauth_state || state !== cookies.oauth_state) {
    return redirectWithError("invalid_state");
  }
  // Present only when this started from connect-start.js (an already
  // logged-in member linking a provider account), never from the plain
  // "Continue with Strava" login button — see verifyConnectTicket above.
  const connectUserId = verifyConnectTicket(cookies.oauth_connect, state);
  const loginIntent = cookies.oauth_intent;
  const clearConnectCookies = () => [
    serializeCookie("oauth_connect", "", { maxAge: 0 }),
    serializeCookie("oauth_intent", "", { maxAge: 0 }),
  ];

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return redirectWithError("server_misconfigured");

  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const redirectUri = `${proto}://${req.headers.host}/api/auth/${provider}/callback`;

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) return redirectWithError("token_exchange_failed");
    const tokenData = await tokenRes.json();
    const profile = config.parseProfile(tokenData);

    if (!profile.providerId) return redirectWithError("no_profile");

    const idColumn = `${provider}_athlete_id`;
    const expiresAtIso = profile.expiresAtSeconds
      ? new Date(profile.expiresAtSeconds * 1000).toISOString()
      : null;
    const tokenFields = {
      [idColumn]: profile.providerId,
      [`${provider}_access_token`]: profile.accessToken || null,
      [`${provider}_refresh_token`]: profile.refreshToken || null,
      ...(provider === "strava" ? { strava_token_expires_at: expiresAtIso } : {}),
    };

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq(idColumn, profile.providerId)
      .maybeSingle();

    // ------------------------------------------------------------------
    // Connect flow: an already-logged-in member linking this provider to
    // their existing account. Never creates a new account and never signs
    // anyone into a different session — just attaches the tokens to the
    // profile they were already on.
    // ------------------------------------------------------------------
    if (connectUserId) {
      if (existing && existing.id !== connectUserId) {
        res.setHeader("Set-Cookie", clearConnectCookies());
        res.writeHead(302, { Location: `${frontend}/dashboard?${provider}=already_linked` });
        res.end();
        return;
      }
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update(tokenFields)
        .eq("id", connectUserId);
      if (updateErr) {
        console.error(`[auth/${provider}/callback] connect update`, updateErr);
        res.setHeader("Set-Cookie", clearConnectCookies());
        res.writeHead(302, { Location: `${frontend}/dashboard?${provider}=error` });
        res.end();
        return;
      }
      res.setHeader("Set-Cookie", clearConnectCookies());
      res.writeHead(302, { Location: `${frontend}/dashboard?${provider}=connected` });
      res.end();
      return;
    }

    // ------------------------------------------------------------------
    // Plain login/signup flow (the "Continue with Strava" button) — finds
    // or creates the account this provider identity belongs to, then signs
    // the browser into it via a one-time magic link, same as before.
    // ------------------------------------------------------------------
    const email = `${provider}-${profile.providerId}@members.rideteagupshup.com`;
    let userId = existing?.id;

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: profile.fullName, auth_provider: provider },
      });
      if (createErr) {
        console.error(`[auth/${provider}/callback] createUser`, createErr);
        return redirectWithError("account_create_failed");
      }
      userId = created.user.id;
    }

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: profile.fullName || null,
      avatar_url: profile.avatarUrl || null,
      auth_provider: provider,
      ...tokenFields,
    });
    if (upsertErr) {
      console.error(`[auth/${provider}/callback] profiles upsert`, upsertErr);
      return redirectWithError("profile_save_failed");
    }

    const redirectTo = `${frontend}/auth/callback${loginIntent ? `?intent=${loginIntent}` : ""}`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (linkError) {
      console.error(`[auth/${provider}/callback] generateLink`, linkError);
      return redirectWithError("session_link_failed");
    }

    res.setHeader("Set-Cookie", clearConnectCookies());
    res.writeHead(302, { Location: linkData.properties.action_link });
    res.end();
  } catch (err) {
    console.error(`[auth/${provider}/callback] unexpected`, err);
    redirectWithError("unexpected_error");
  }
}
