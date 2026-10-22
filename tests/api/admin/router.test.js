import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import handler from "../../../api/admin/[adminRoute].js";
import { requireAdmin } from "../../../api-lib/requireAdmin.js";
import { mockReq, mockRes } from "../../helpers/http.js";
vi.mock("../../../api-lib/requireAdmin.js", () => ({ requireAdmin: vi.fn() }));
vi.mock("../../../api-lib/stravaSync.js", () => ({ advanceStravaBackfill: vi.fn(), resetStravaBackfill: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RTG_LAYOUT_EDITOR_ENABLED", "false");
  requireAdmin.mockResolvedValue({ ok: false, status: 401, error: "missing_token" });
});
async function call(url, options = {}) {
  const req = { ...mockReq(options), url };
  const res = mockRes();
  await handler(req, res);
  return { req, res };
}
describe("path-preserving consolidated admin dispatcher", () => {
  it('dispatches the volunteer endpoint to its own default-deny identity guard',async()=>{
    const {res}=await call('/api/admin/volunteer-ridge',{method:'GET'});
    expect(res.statusCode).toBe(401);expect(requireAdmin).not.toHaveBeenCalled();
  });
  it.each(["GET", "POST"])("keeps page layouts disabled by default for %s", async (method) => {
    const { res } = await call("/api/admin/page-layouts?action=published&pageKey=home", { method, query: { adminRoute: "page-layouts", action: "published", pageKey: "home" } });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "layout_editor_not_enabled" });
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps layout operation query separate from the dynamic route parameter", async () => {
    // Test-only flag: no deployment configuration is changed.
    vi.stubEnv("RTG_LAYOUT_EDITOR_ENABLED", "true");
    const { req, res } = await call("/api/admin/page-layouts?action=draft&pageKey=home", { method: "GET", query: { adminRoute: "page-layouts", action: "draft", pageKey: "home" } });
    expect(res.statusCode).toBe(401);
    expect(requireAdmin).toHaveBeenCalledExactlyOnceWith(req);
    expect(req.query.action).toBe("draft");
  });
  it.each(["ridge", "strava-resync"])("keeps %s POST auth checks and exact request", async (action) => {
    const { req, res } = await call(`/api/admin/${action}`, { method: "POST", body: { command: "unchanged" }, headers: { authorization: "Bearer synthetic" } });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "missing_token" });
    expect(requireAdmin).toHaveBeenCalledExactlyOnceWith(req);
  });
  it.each(["ridge", "strava-resync"])("preserves %s ordinary-member refusal", async (action) => {
    requireAdmin.mockResolvedValue({ ok: false, status: 403, error: "not_admin" });
    const { res } = await call(`/api/admin/${action}`);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "not_admin" });
  });
  it.each(["ridge", "strava-resync"])("preserves %s method restrictions", async (action) => {
    const { res } = await call(`/api/admin/${action}`, { method: "DELETE" });
    expect(res.statusCode).toBe(405);
    expect(requireAdmin).not.toHaveBeenCalled();
  });
  it("ignores adminRoute query overrides and arrays", async () => {
    for (const adminRoute of ["strava-resync", ["page-layouts", "ridge"]]) {
      const { res } = await call("/api/admin/ridge?adminRoute=strava-resync", { method: "GET", query: { adminRoute } });
      expect(res.statusCode).toBe(401);
      expect(res.headers["cache-control"]).toBe("no-store");
    }
  });
  it("does not let query action override Ridge GET routing", async () => {
    const { res } = await call("/api/admin/ridge?action=strava-resync", { method: "GET", query: { action: "strava-resync" } });
    expect(res.statusCode).toBe(401); // Ridge permits GET, then checks auth.
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(requireAdmin).toHaveBeenCalledOnce();
  });
  it("does not let query action override Strava GET routing", async () => {
    const { res } = await call("/api/admin/strava-resync?action=ridge", { method: "GET", query: { action: "ridge" } });
    expect(res.statusCode).toBe(405); // Strava rejects GET before auth.
    expect(requireAdmin).not.toHaveBeenCalled();
  });
  it("ignores ambiguous action query arrays", async () => {
    const { res } = await call("/api/admin/ridge?action=ridge&action=strava-resync", { method: "GET", query: { action: ["ridge", "strava-resync"] } });
    expect(res.statusCode).toBe(401);
  });
  it.each([
    undefined, "/api/admin/unknown", "/api/admin/constructor", "/api/admin/toString",
    "/api/admin/__proto__", "/api/admin/../admin/ridge", "/api/admin/%2e%2e/admin/ridge",
    "/api/admin/%72idge", "/api/admin/ridge/extra", "/api/admin/ridge%2fextra",
    "https://example.test/api/admin/ridge", "/api/admin/[action]?action=ridge",
  ])("fails closed on unknown or ambiguous path %s", async (url) => {
    const { res } = await call(url, { query: { action: "ridge" } });
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "unknown_admin_route" });
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});
describe("deployment shape", () => {
  it("has exactly 12 functions, with admin implementation outside api", () => {
    const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith(".js") ? [path.join(dir, entry.name)] : []);
    const files = walk("api");
    expect(files).toHaveLength(12);
    expect(files.filter(file => file.startsWith("api/admin/"))).toEqual(["api/admin/[adminRoute].js"]);
  });
  it("preserves both cron paths, schedules and backfill duration", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.crons).toEqual([
      { path: "/api/cron/purge-media", schedule: "0 3 * * *" },
      { path: "/api/cron/strava-backfill", schedule: "30 21 * * *" },
    ]);
    expect(config.functions["api/cron/strava-backfill.js"]).toEqual({ maxDuration: 60 });
    expect(config.functions["api/admin/*.js"]).toEqual({ maxDuration: 60 });
    expect(config.rewrites).toEqual([{ source: "/((?!api/).*)", destination: "/index.html" }]);
  });
});

