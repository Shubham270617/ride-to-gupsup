import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockReq, mockRes } from "../helpers/http.js";

// providers.js reads process.env when it is first imported, so each test
// sets the env and then imports a fresh copy.
async function load(env = {}) {
  for (const key of [
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
    "XFITCONNECT_CLIENT_ID",
    "XFITCONNECT_CLIENT_SECRET",
    "XFITCONNECT_AUTHORIZE_URL",
    "XFITCONNECT_TOKEN_URL",
  ]) {
    vi.stubEnv(key, env[key] ?? "");
  }
  vi.resetModules();
  return import("../../api-lib/providers.js");
}

beforeEach(() => vi.resetModules());

describe("providers", () => {
  it("strava is configured only with both client id and secret", async () => {
    expect((await load()).isProviderConfigured("strava")).toBe(false);
    expect((await load({ STRAVA_CLIENT_ID: "1" })).isProviderConfigured("strava")).toBe(false);
    expect(
      (await load({ STRAVA_CLIENT_ID: "1", STRAVA_CLIENT_SECRET: "s" })).isProviderConfigured("strava")
    ).toBe(true);
  });

  it("xfitconnect also needs its authorize and token URLs", async () => {
    const partial = await load({ XFITCONNECT_CLIENT_ID: "1", XFITCONNECT_CLIENT_SECRET: "s" });
    expect(partial.isProviderConfigured("xfitconnect")).toBe(false);
    const full = await load({
      XFITCONNECT_CLIENT_ID: "1",
      XFITCONNECT_CLIENT_SECRET: "s",
      XFITCONNECT_AUTHORIZE_URL: "https://x/auth",
      XFITCONNECT_TOKEN_URL: "https://x/token",
    });
    expect(full.isProviderConfigured("xfitconnect")).toBe(true);
  });

  it("unknown providers are never configured", async () => {
    const { isProviderConfigured } = await load({ STRAVA_CLIENT_ID: "1", STRAVA_CLIENT_SECRET: "s" });
    expect(isProviderConfigured("google")).toBe(false);
    expect(isProviderConfigured("__proto__")).toBe(false);
  });

  it("strava asks for activity:read_all so private rides count", async () => {
    const { providers } = await load();
    expect(providers.strava.scope).toBe("read,activity:read_all");
  });

  it("parses a Strava token response into a profile", async () => {
    const { providers } = await load();
    expect(
      providers.strava.parseProfile({
        athlete: { id: 12345, firstname: "Asha", lastname: "Rao", profile: "https://img" },
        access_token: "at",
        refresh_token: "rt",
        expires_at: 1700000000,
      })
    ).toEqual({
      providerId: "12345",
      fullName: "Asha Rao",
      avatarUrl: "https://img",
      accessToken: "at",
      refreshToken: "rt",
      expiresAtSeconds: 1700000000,
    });
  });

  it("copes with a Strava athlete missing names or id", async () => {
    const { providers } = await load();
    const p = providers.strava.parseProfile({ athlete: { id: 0, firstname: "Solo" } });
    expect(p.providerId).toBe("0");
    expect(p.fullName).toBe("Solo");
    expect(providers.strava.parseProfile({}).providerId).toBe("");
  });

  it("parses an XFitConnect profile from athlete_id or user.id", async () => {
    const { providers } = await load();
    expect(providers.xfitconnect.parseProfile({ athlete_id: 7 }).providerId).toBe("7");
    expect(providers.xfitconnect.parseProfile({ user: { id: 9, name: "N" } })).toMatchObject({
      providerId: "9",
      fullName: "N",
    });
  });
});

describe("GET /api/auth/providers", () => {
  it("reports which providers are live, uncached", async () => {
    await load({ STRAVA_CLIENT_ID: "1", STRAVA_CLIENT_SECRET: "s" });
    const { default: handler } = await import("../../api/auth/providers.js");
    const res = mockRes();
    handler(mockReq({ method: "GET" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ strava: true, xfitconnect: false });
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("GET /api/auth/[provider]/start", () => {
  async function start(query, env) {
    await load(env);
    vi.stubEnv("FRONTEND_URL", "https://rtg.test");
    vi.stubEnv("NODE_ENV", "production");
    const { default: handler } = await import("../../api/auth/[provider]/start.js");
    const res = mockRes();
    await handler(mockReq({ method: "GET", query, headers: { host: "rtg.test" } }), res);
    return res;
  }

  it("404s an unknown provider", async () => {
    const res = await start({ provider: "myspace" });
    expect(res.statusCode).toBe(404);
  });

  it("redirects back with not_configured when keys are missing", async () => {
    const res = await start({ provider: "strava" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://rtg.test/auth/callback?error=not_configured&provider=strava");
  });

  it("redirects to Strava with state, scope and a matching state cookie", async () => {
    const res = await start(
      { provider: "strava", intent: "login" },
      { STRAVA_CLIENT_ID: "cid", STRAVA_CLIENT_SECRET: "sec" }
    );
    expect(res.statusCode).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("redirect_uri")).toBe("https://rtg.test/api/auth/strava/callback");
    expect(url.searchParams.get("scope")).toBe("read,activity:read_all");
    expect(url.searchParams.get("approval_prompt")).toBe("auto");
    const state = url.searchParams.get("state");
    expect(state).toMatch(/^[0-9a-f]{32}$/);
    const cookies = res.headers["set-cookie"];
    expect(cookies[0]).toBe(`oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`);
    expect(cookies[1]).toContain("oauth_intent=login");
    // never leaks the secret
    expect(res.headers.location).not.toContain("sec");
  });

  it("ignores an unexpected intent value", async () => {
    const res = await start(
      { provider: "strava", intent: "<script>" },
      { STRAVA_CLIENT_ID: "cid", STRAVA_CLIENT_SECRET: "sec" }
    );
    expect(res.headers["set-cookie"]).toHaveLength(1);
  });
});
