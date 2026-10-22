import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/requireAdmin.js", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "../../../api-lib/requireAdmin.js";
import handler from "../../../api-lib/admin/strava-webhook.js";
import router from "../../../api/admin/[adminRoute].js";

let fetchMock;
const CALLBACK = "https://rideteagupshup.com/api/webhooks/strava";
const call = (method = "GET") => {
  const res = mockRes();
  return handler(mockReq({ method, headers: { host: "rideteagupshup.com", authorization: "Bearer t" } }), res).then(() => res);
};
const sub = (id, url) => ({ id, callback_url: url, created_at: "2026-10-01T00:00:00Z" });

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ ok: true, user: { id: "admin" } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("FRONTEND_URL", "");
  vi.stubEnv("STRAVA_CLIENT_ID", "123");
  vi.stubEnv("STRAVA_CLIENT_SECRET", "secret");
  vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "verify-me");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/api/admin/strava-webhook", () => {
  it("is admin-only", async () => {
    requireAdmin.mockResolvedValue({ ok: false, status: 403, error: "not_admin" });
    const res = await call();
    expect(res.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is reachable through the admin router", async () => {
    requireAdmin.mockResolvedValue({ ok: false, status: 401, error: "missing_token" });
    const res = mockRes();
    await router(Object.assign(mockReq({ method: "GET" }), { url: "/api/admin/strava-webhook" }), res);
    expect(res.statusCode).toBe(401);
  });

  it("names the missing Vercel settings instead of calling Strava", async () => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "");
    const res = await call();
    expect(res.body).toEqual({ live: false, missing: ["STRAVA_WEBHOOK_VERIFY_TOKEN"], callbackUrl: CALLBACK });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET: live when Strava's subscription points at this site", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sub(5, CALLBACK)]));
    const res = await call();
    expect(res.body).toMatchObject({ live: true, subscription: { id: 5, callbackUrl: CALLBACK } });
    expect(String(fetchMock.mock.calls[0][0])).toContain("client_id=123");
  });

  it("GET: off when there is no subscription — and registers nothing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const res = await call();
    expect(res.body).toMatchObject({ live: false, subscription: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("POST: registers this site's address with the verify token", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 9 }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse([sub(9, CALLBACK)]));
    const res = await call("POST");
    expect(res.body).toMatchObject({ live: true, subscription: { id: 9 } });
    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(init.body)).toEqual({ client_id: "123", client_secret: "secret", callback_url: CALLBACK, verify_token: "verify-me" });
  });

  it("POST: replaces a subscription that points somewhere else", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([sub(4, "https://old.example.com/api/webhooks/strava")]))
      .mockResolvedValueOnce(jsonResponse(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ id: 9 }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse([sub(9, CALLBACK)]));
    const res = await call("POST");
    expect(res.body.live).toBe(true);
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/push_subscriptions/4?");
  });

  it("POST: does nothing when it's already live", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sub(5, CALLBACK)]));
    const res = await call("POST");
    expect(res.body.live).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("502 with Strava's reason when it refuses", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ message: "Bad Request", errors: [{ field: "callback url", code: "GET to callback URL does not return 200" }] }, { status: 400 }));
    const res = await call("POST");
    expect(res.statusCode).toBe(502);
    expect(res.body.message).toMatch(/does not return 200/);
  });

  it("never sends the client secret back to the browser", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sub(5, CALLBACK)]));
    const res = await call();
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});
