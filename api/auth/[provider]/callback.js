import { providers, isProviderConfigured } from "../../lib/providers.js";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin.js";
import { parseCookies } from "../../lib/cookies.js";

export default async function handler(req, res) {
  const { provider, code, state, error: providerError } = req.query;
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
    const email = `${provider}-${profile.providerId}@members.ridetegupshup.in`;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq(idColumn, profile.providerId)
      .maybeSingle();

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

    const expiresAtIso = profile.expiresAtSeconds
      ? new Date(profile.expiresAtSeconds * 1000).toISOString()
      : null;

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: profile.fullName || null,
      avatar_url: profile.avatarUrl || null,
      auth_provider: provider,
      [idColumn]: profile.providerId,
      [`${provider}_access_token`]: profile.accessToken || null,
      [`${provider}_refresh_token`]: profile.refreshToken || null,
      ...(provider === "strava" ? { strava_token_expires_at: expiresAtIso } : {}),
    });
    if (upsertErr) {
      console.error(`[auth/${provider}/callback] profiles upsert`, upsertErr);
      return redirectWithError("profile_save_failed");
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${frontend}/auth/callback` },
    });
    if (linkError) {
      console.error(`[auth/${provider}/callback] generateLink`, linkError);
      return redirectWithError("session_link_failed");
    }

    res.writeHead(302, { Location: linkData.properties.action_link });
    res.end();
  } catch (err) {
    console.error(`[auth/${provider}/callback] unexpected`, err);
    redirectWithError("unexpected_error");
  }
}
