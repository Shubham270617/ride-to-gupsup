// One place to configure every "Continue with X" OAuth provider.
// To activate XFitConnect for real once they share API docs: fill in the
// XFITCONNECT_* env vars (see api/.env.example) — no code changes needed.

export const providers = {
  strava: {
    label: "Strava",
    authorizeUrl: "https://www.strava.com/oauth/authorize",
    tokenUrl: "https://www.strava.com/api/v3/oauth/token",
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    scope: "read",
    extraAuthorizeParams: { approval_prompt: "auto" },
    parseProfile: (tokenData) => ({
      providerId: tokenData.athlete?.id != null ? String(tokenData.athlete.id) : "",
      fullName: [tokenData.athlete?.firstname, tokenData.athlete?.lastname].filter(Boolean).join(" "),
      avatarUrl: tokenData.athlete?.profile,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAtSeconds: tokenData.expires_at,
    }),
  },
  xfitconnect: {
    label: "XFitConnect",
    authorizeUrl: process.env.XFITCONNECT_AUTHORIZE_URL,
    tokenUrl: process.env.XFITCONNECT_TOKEN_URL,
    clientId: process.env.XFITCONNECT_CLIENT_ID,
    clientSecret: process.env.XFITCONNECT_CLIENT_SECRET,
    scope: "profile",
    extraAuthorizeParams: {},
    // Best guess at a typical OAuth profile shape — adjust once XFitConnect's
    // real token/profile response format is known.
    parseProfile: (tokenData) => ({
      providerId: tokenData.athlete_id != null ? String(tokenData.athlete_id) : String(tokenData.user?.id ?? ""),
      fullName: tokenData.user?.name ?? tokenData.user?.full_name,
      avatarUrl: tokenData.user?.avatar_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAtSeconds: tokenData.expires_at,
    }),
  },
};

export function isProviderConfigured(key) {
  const p = providers[key];
  return Boolean(p && p.clientId && p.clientSecret && p.authorizeUrl && p.tokenUrl);
}
