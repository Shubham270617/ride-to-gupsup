import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/requireAdmin.js", () => ({ requireAdmin: vi.fn() }));
vi.mock("../../../api-lib/stravaSync.js", () => ({
  advanceStravaBackfill: vi.fn(),
  resetStravaBackfill: vi.fn(),
}));

import { requireAdmin } from "../../../api-lib/requireAdmin.js";
import { advanceStravaBackfill, resetStravaBackfill } from "../../../api-lib/stravaSync.js";
import handler from "../../../api/admin/strava-resync.js";

let db;

function call({ method = "POST", body, query = {} } = {}) {
  const res = mockRes();
  return handler(mockReq({ method, body, query }), res).then(() => res);
}

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase();
  requireAdmin.mockResolvedValue({ ok: true, user: { id: "admin" }, supabaseAdmin: db });
  advanceStravaBackfill.mockResolvedValue({ done: false, fetched: 10 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/admin/strava-resync", () => {
  it("405 for non-POST", async () => {
    expect((await call({ method: "GET" })).statusCode).toBe(405);
  });

  it("passes the requireAdmin refusal straight through", async () => {
    requireAdmin.mockResolvedValue({ ok: false, status: 403, error: "not_authorised" });
    const res = await call({ body: { userId: "u1" } });
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "not_authorised" });
    expect(resetStravaBackfill).not.toHaveBeenCalled();
  });

  it("resets then advances one member", async () => {
    const res = await call({ body: { userId: "u1" } });
    expect(res.body).toEqual({ queued: 1, advanced: 1, results: [{ userId: "u1", fetched: 10, done: false }] });
    expect(resetStravaBackfill).toHaveBeenCalledWith(db, "u1");
    expect(resetStravaBackfill.mock.invocationCallOrder[0]).toBeLessThan(
      advanceStravaBackfill.mock.invocationCallOrder[0]
    );
  });

  it("with no userId, resets every connected member before advancing any", async () => {
    db.on("profiles", { data: [{ id: "a" }, { id: "b" }] });
    const res = await call({ body: {} });
    expect(res.body.queued).toBe(2);
    expect(resetStravaBackfill).toHaveBeenCalledTimes(2);
    expect(resetStravaBackfill.mock.invocationCallOrder[1]).toBeLessThan(
      advanceStravaBackfill.mock.invocationCallOrder[0]
    );
  });

  it("reports a per-member failure without failing the request", async () => {
    advanceStravaBackfill.mockRejectedValue(new Error("revoked"));
    const res = await call({ query: { userId: "u1" } });
    expect(res.statusCode).toBe(200);
    expect(res.body.results).toEqual([{ userId: "u1", error: "revoked" }]);
  });

  it("500 when the member list can't be read", async () => {
    db.on("profiles", { error: { message: "down" } });
    const res = await call({ body: {} });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "query_failed", message: "down" });
  });
});
