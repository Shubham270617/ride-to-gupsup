import { randomBytes } from "node:crypto";
import { providers, isProviderConfigured } from "../../../api-lib/providers.js";
import { serializeCookie } from "../../../api-lib/cookies.js";

export default async function handler(req, res) {
  // Vercel's [provider] folder convention puts this in req.query; Express's
  // :provider route param (used by the Hostinger/server.js deployment
  // target) puts it in req.params instead — support both.
  const provider = req.query.provider || req.params?.provider;
  const config = providers[provider];

  if (!config) {
    res.status(404).send("Unknown provider");
    return;
  }

  const frontend = process.env.FRONTEND_URL || "/";

  if (!isProviderConfigured(provider)) {
    res.writeHead(302, {
      Location: `${frontend}/auth/callback?error=not_configured&provider=${provider}`,
    });
    res.end();
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

  const cookies = [serializeCookie("oauth_state", state, { maxAge: 600 })];
  // Carried through to the final redirect so AuthCallback.jsx can apply the
  // same "clicked Log In but this just created a brand-new account" check
  // it already does for Google — see callback.js.
  const intent = req.query.intent;
  if (intent === "login" || intent === "signup") {
    cookies.push(serializeCookie("oauth_intent", intent, { maxAge: 600 }));
  }
  res.setHeader("Set-Cookie", cookies);
  res.writeHead(302, { Location: authorizeUrl.toString() });
  res.end();
}
