import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("../../../api-lib/stravaSync.js", () => ({ advanceStravaBackfill: vi.fn() }));
vi.mock("../../../api-lib/storageDestroy.js", () => ({ destroyStorageAsset: vi.fn() }));

import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import { advanceStravaBackfill } from "../../../api-lib/stravaSync.js";
import { destroyStorageAsset } from "../../../api-lib/storageDestroy.js";
import purgeMedia from "../../../api/cron/purge-media.js";
import stravaBackfill from "../../../api/cron/strava-backfill.js";

let db;

function call(handler, { auth, query = {} } = {}) {
  const res = mockRes();
  const req = mockReq({ method: "GET", query, headers: auth === undefined ? {} : { authorization: auth } });
  return handler(req, res).then(() => res);
}

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each([
  ["purge-media", purgeMedia],
  ["strava-backfill", stravaBackfill],
])("cron auth: %s", (_name, handler) => {
  it("refuses to run at all when CRON_SECRET is unset — even with no auth header", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await call(handler);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "server_misconfigured" });
    expect(db.queries).toHaveLength(0);
  });

  it("refuses 'Bearer undefined'/'Bearer ' when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call(handler, { auth: "Bearer " })).statusCode).toBe(500);
    expect((await call(handler, { auth: "Bearer undefined" })).statusCode).toBe(500);
  });

  it.each([undefined, "", "cron-secret", "Bearer wrong", "Basic cron-secret", "bearer cron-secret"])(
    "401 for authorization %j",
    async (auth) => {
      const res = await call(handler, { auth });
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: "unauthorized" });
      expect(db.queries).toHaveLength(0);
    }
  );

  it("500 when authorised but Supabase is not configured", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    const res = await call(handler, { auth: "Bearer cron-secret" });
    expect(res.statusCode).toBe(500);
  });
});

describe("cron: purge-media", () => {
  it("destroys queued media older than 2 days and removes each queue row", async () => {
    db.on("media_pending_deletions", { data: [{ id: 1, url: "u1" }, { id: 2, url: "u2" }] }, { action: "select" });
    const res = await call(purgeMedia, { auth: "Bearer cron-secret" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ purged: 2, failed: 0, failures: [] });
    expect(destroyStorageAsset).toHaveBeenCalledWith(db, "u1");
    const cutoff = new Date(db.queriesFor("media_pending_deletions", "select")[0].filterValue("lte", "created_at"));
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(2 * 86400000 - 1000);
    expect(db.queriesFor("media_pending_deletions", "delete").map((q) => q.filterValue("eq", "id"))).toEqual([1, 2]);
  });

  it("keeps going after one failure and reports it, leaving that row queued", async () => {
    db.on("media_pending_deletions", { data: [{ id: 1, url: "u1" }, { id: 2, url: "u2" }] }, { action: "select" });
    destroyStorageAsset.mockRejectedValueOnce(new Error("storage down"));
    const res = await call(purgeMedia, { auth: "Bearer cron-secret" });
    expect(res.body).toEqual({ purged: 1, failed: 1, failures: [{ id: 1, message: "storage down" }] });
    expect(db.queriesFor("media_pending_deletions", "delete").map((q) => q.filterValue("eq", "id"))).toEqual([2]);
  });

  it("500 query_failed when the queue can't be read", async () => {
    db.on("media_pending_deletions", { error: { message: "nope" } });
    const res = await call(purgeMedia, { auth: "Bearer cron-secret" });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "query_failed", message: "nope" });
  });
});

describe("cron: strava-backfill", () => {
  it("advances up to 5 pending members, oldest watermark first", async () => {
    db.on("profiles", { data: [{ id: "a" }, { id: "b" }] }, { action: "select" });
    advanceStravaBackfill.mockResolvedValue({ done: false, fetched: 200 });
    const res = await call(stravaBackfill, { auth: "Bearer cron-secret" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      processed: 2,
      results: [
        { userId: "a", fetched: 200, done: false },
        { userId: "b", fetched: 200, done: false },
      ],
    });
    const [q] = db.queriesFor("profiles", "select");
    expect(q.limit).toBe(5);
    expect(q.hasFilter("eq", "strava_backfill_done", false)).toBe(true);
    expect(q.order[0]).toMatchObject({ column: "strava_synced_through", ascending: true, nullsFirst: true });
    expect(advanceStravaBackfill).toHaveBeenCalledWith(db, "a", { deadline: expect.any(Number) });
  });

  it("one member's failure doesn't stop the others", async () => {
    db.on("profiles", { data: [{ id: "a" }, { id: "b" }] }, { action: "select" });
    advanceStravaBackfill.mockRejectedValueOnce(new Error("revoked")).mockResolvedValueOnce({ done: true, fetched: 3 });
    const res = await call(stravaBackfill, { auth: "Bearer cron-secret" });
    expect(res.body.results).toEqual([
      { userId: "a", error: "revoked" },
      { userId: "b", fetched: 3, done: true },
    ]);
  });

  it("?userId= targets exactly one connected member", async () => {
    db.on("profiles", { data: [{ id: "solo" }] }, { action: "select" });
    advanceStravaBackfill.mockResolvedValue({ done: true, fetched: 0 });
    const res = await call(stravaBackfill, { auth: "Bearer cron-secret", query: { userId: "solo" } });
    expect(res.body.processed).toBe(1);
    const [q] = db.queriesFor("profiles", "select");
    expect(q.hasFilter("eq", "id", "solo")).toBe(true);
    expect(q.filters).toContainEqual({ op: "not", column: "strava_refresh_token", value: ["is", null] });
  });

  it("500 query_failed when the member list can't be read", async () => {
    db.on("profiles", { error: { message: "down" } });
    const res = await call(stravaBackfill, { auth: "Bearer cron-secret" });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "query_failed", message: "down" });
  });
});
