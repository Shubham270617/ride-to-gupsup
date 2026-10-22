import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { jsonResponse, mockReq, mockRes } from "../helpers/http.js";

vi.mock("../../api-lib/stravaAuth.js", () => ({ getValidStravaAccessToken: vi.fn() }));
vi.mock("../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getValidStravaAccessToken } from "../../api-lib/stravaAuth.js";
import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { syncNewActivities } from "../../api-lib/stravaSync.js";
import stravaRefresh from "../../api-lib/stravaRefresh.js";
import account from "../../api/auth/account.js";

let db;
let fetchMock;
const ride = (id, startDate) => ({ id, type: "Ride", name: `Ride ${id}`, distance: 10000, moving_time: 1800, total_elevation_gain: 50, average_speed: 5.5, start_date: startDate });
const epoch = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const stravaUrls = () => fetchMock.mock.calls.map(([url]) => String(url)).filter((u) => u.includes("strava.com"));

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  getValidStravaAccessToken.mockResolvedValue("access-token");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("syncNewActivities() — new rides without a webhook", () => {
  it("asks Strava only for rides after the newest one we hold (less a day), and saves them", async () => {
    db.on("strava_activities", { data: { start_date: "2026-10-20T06:00:00Z" } }, { action: "select", times: 1 });
    fetchMock.mockResolvedValueOnce(jsonResponse([ride(7, "2026-10-21T06:00:00Z"), ride(8, "2026-10-22T06:00:00Z")])).mockResolvedValueOnce(jsonResponse([]));
    const result = await syncNewActivities(db, "u1");
    expect(result).toEqual({ fetched: 2 });
    const [first, second] = stravaUrls();
    expect(first).toContain(`after=${epoch("2026-10-20T06:00:00Z") - 86400}`);
    expect(second).toContain(`after=${epoch("2026-10-22T06:00:00Z")}`);
    const upsert = db.queriesFor("strava_activities", "upsert")[0];
    expect(upsert.payload.map((r) => r.strava_activity_id)).toEqual([7, 8]);
    expect(upsert.options).toEqual({ onConflict: "strava_activity_id" });
    expect(db.queriesFor("leaderboard_stats", "upsert")).toHaveLength(1); // totals recomputed
  });

  it("costs one request and changes no totals when nothing is new, but records the check", async () => {
    db.on("strava_activities", { data: { start_date: "2026-10-20T06:00:00Z" } }, { action: "select", times: 1 });
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    expect(await syncNewActivities(db, "u1")).toEqual({ fetched: 0 });
    expect(stravaUrls()).toHaveLength(1);
    expect(db.queriesFor("leaderboard_stats")).toHaveLength(0);
    const update = db.queriesFor("profiles", "update")[0];
    expect(update.payload).toEqual({ strava_checked_at: expect.any(String) });
    expect(update.hasFilter("eq", "id", "u1")).toBe(true);
  });

  it("looks back 30 days for a member with no rides yet", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const before = Math.floor(Date.now() / 1000) - 30 * 86400;
    await syncNewActivities(db, "u1");
    const after = Number(new URL(stravaUrls()[0]).searchParams.get("after"));
    expect(Math.abs(after - before)).toBeLessThan(5);
  });

  it("stops cleanly on Strava's rate limit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 429 }));
    expect(await syncNewActivities(db, "u1")).toEqual({ fetched: 0, rateLimited: true });
  });

  it("does nothing without a Strava connection", async () => {
    getValidStravaAccessToken.mockResolvedValue(null);
    expect(await syncNewActivities(db, "u1")).toEqual({ fetched: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never loops on a page whose dates don't move forward", async () => {
    db.on("strava_activities", { data: { start_date: "2026-10-20T06:00:00Z" } }, { action: "select", times: 1 });
    fetchMock.mockResolvedValue(jsonResponse([ride(1, "2026-10-01T06:00:00Z")]));
    await syncNewActivities(db, "u1");
    expect(stravaUrls()).toHaveLength(1);
  });
});

describe("POST /api/auth/account?op=strava-refresh", () => {
  const call = ({ method = "POST", token = "good-token" } = {}) => {
    const res = mockRes();
    return account(mockReq({ method, query: { op: "strava-refresh" }, headers: token ? { authorization: `Bearer ${token}` } : {} }), res).then(() => res);
  };
  beforeEach(() => db.signIn({ id: "u1", email: "rider@example.com" }));

  it("refuses without a valid session", async () => {
    expect((await call({ token: null })).statusCode).toBe(401);
    expect((await call({ token: "forged" })).statusCode).toBe(401);
    expect((await call({ method: "GET" })).statusCode).toBe(405);
  });

  it("skips members without Strava", async () => {
    db.on("profiles", { data: { strava_refresh_token: null } }, { action: "select" });
    expect((await call()).body).toEqual({ skipped: "not_connected" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips a member checked in the last 10 minutes", async () => {
    db.on("profiles", { data: { strava_refresh_token: "r", strava_checked_at: new Date(Date.now() - 60_000).toISOString() } }, { action: "select" });
    expect((await call()).body).toEqual({ skipped: "recent" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pulls in the signed-in member's new rides, only theirs", async () => {
    db.on("profiles", { data: { strava_refresh_token: "r", strava_checked_at: "2026-01-01T00:00:00Z" } }, { action: "select" });
    db.on("strava_activities", { data: { start_date: "2026-10-20T06:00:00Z" } }, { action: "select", times: 1 });
    fetchMock.mockResolvedValueOnce(jsonResponse([ride(9, "2026-10-22T06:00:00Z")])).mockResolvedValueOnce(jsonResponse([]));
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ fetched: 1 });
    expect(getValidStravaAccessToken).toHaveBeenCalledWith(db, "u1");
    expect(db.queriesFor("strava_activities", "upsert")[0].payload[0].user_id).toBe("u1");
  });

  it("502 when Strava fails", async () => {
    db.on("profiles", { data: { strava_refresh_token: "r" } }, { action: "select" });
    getValidStravaAccessToken.mockRejectedValue(new Error("boom"));
    expect((await call()).statusCode).toBe(502);
  });

  it("is exported as its own handler too", () => {
    expect(typeof stravaRefresh).toBe("function");
  });
});
