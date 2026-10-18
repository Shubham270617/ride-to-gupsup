import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { jsonResponse } from "../helpers/http.js";

vi.mock("../../api-lib/stravaAuth.js", () => ({ getValidStravaAccessToken: vi.fn() }));

import { getValidStravaAccessToken } from "../../api-lib/stravaAuth.js";
import {
  advanceStravaBackfill,
  backfillRecentActivities,
  deleteOneActivity,
  recomputeLeaderboard,
  resetStravaBackfill,
  syncOneActivity,
} from "../../api-lib/stravaSync.js";

let db;
let fetchMock;

const activity = (id, startDate, extra = {}) => ({
  id,
  type: "Ride",
  name: `Ride ${id}`,
  distance: 10000,
  moving_time: 1800,
  total_elevation_gain: 50,
  average_speed: 5.5,
  start_date: startDate,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase();
  getValidStravaAccessToken.mockResolvedValue("access-token");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("recomputeLeaderboard()", () => {
  it("sums every activity and writes the public row with name and avatar", async () => {
    db.on(
      "strava_activities",
      {
        data: [
          { distance_meters: 1000, moving_time_seconds: 60 },
          { distance_meters: "2500.5", moving_time_seconds: null },
        ],
      },
      { action: "select" }
    );
    db.on("profiles", { data: { full_name: "Asha", avatar_url: "a.png" } }, { action: "select" });
    await recomputeLeaderboard(db, "u1");
    const [write] = db.queriesFor("leaderboard_stats", "upsert");
    expect(write.payload).toMatchObject({
      user_id: "u1",
      full_name: "Asha",
      avatar_url: "a.png",
      total_distance_meters: 3500.5,
      total_moving_time_seconds: 60,
      activity_count: 2,
    });
  });

  it("pages past PostgREST's 1000-row cap", async () => {
    const page = (n) => Array.from({ length: n }, () => ({ distance_meters: 1, moving_time_seconds: 1 }));
    db.on("strava_activities", { data: page(1000) }, { action: "select", times: 1 });
    db.on("strava_activities", { data: page(1000) }, { action: "select", times: 1 });
    db.on("strava_activities", { data: page(7) }, { action: "select", times: 1 });
    await recomputeLeaderboard(db, "u1");
    const reads = db.queriesFor("strava_activities", "select");
    expect(reads.map((q) => q.range)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(db.queriesFor("leaderboard_stats", "upsert")[0].payload.activity_count).toBe(2007);
  });

  it("throws (rather than writing a short total) when a read fails", async () => {
    db.on("strava_activities", { error: { message: "timeout" } }, { action: "select" });
    await expect(recomputeLeaderboard(db, "u1")).rejects.toEqual({ message: "timeout" });
    expect(db.queriesFor("leaderboard_stats")).toHaveLength(0);
  });

  it("throws when the leaderboard write fails", async () => {
    db.on("strava_activities", { data: [] }, { action: "select" });
    db.on("leaderboard_stats", { error: { message: "rls" } }, { action: "upsert" });
    await expect(recomputeLeaderboard(db, "u1")).rejects.toEqual({ message: "rls" });
  });
});

describe("syncOneActivity()", () => {
  it("fetches the activity, upserts on strava_activity_id and recomputes", async () => {
    fetchMock.mockResolvedValue(jsonResponse(activity(55, "2026-01-01T06:00:00Z")));
    db.on("strava_activities", { data: [] }, { action: "select" });
    await syncOneActivity(db, "u1", 55);
    expect(fetchMock).toHaveBeenCalledWith("https://www.strava.com/api/v3/activities/55", {
      headers: { Authorization: "Bearer access-token" },
    });
    const [upsert] = db.queriesFor("strava_activities", "upsert");
    expect(upsert.options).toEqual({ onConflict: "strava_activity_id" });
    expect(upsert.payload[0]).toMatchObject({
      user_id: "u1",
      strava_activity_id: 55,
      type: "Ride",
      distance_meters: 10000,
      moving_time_seconds: 1800,
      elevation_gain_meters: 50,
      average_speed: 5.5,
      start_date: "2026-01-01T06:00:00Z",
    });
    expect(db.queriesFor("leaderboard_stats", "upsert")).toHaveLength(1);
  });

  it("does nothing without a usable token", async () => {
    getValidStravaAccessToken.mockResolvedValue(null);
    await syncOneActivity(db, "u1", 55);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a failed fetch so the webhook asks for redelivery", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 404 }));
    await expect(syncOneActivity(db, "u1", 55)).rejects.toThrow("strava activity fetch 404");
  });

  it("surfaces upsert errors instead of silently writing nothing", async () => {
    fetchMock.mockResolvedValue(jsonResponse(activity(55, "2026-01-01T06:00:00Z")));
    db.on("strava_activities", { error: { code: "23505" } }, { action: "upsert" });
    await expect(syncOneActivity(db, "u1", 55)).rejects.toEqual({ code: "23505" });
  });
});

describe("deleteOneActivity()", () => {
  it("deletes scoped to the owner and recomputes", async () => {
    await deleteOneActivity(db, "u1", 55);
    const [del] = db.queriesFor("strava_activities", "delete");
    expect(del.hasFilter("eq", "user_id", "u1")).toBe(true);
    expect(del.hasFilter("eq", "strava_activity_id", 55)).toBe(true);
    expect(db.queriesFor("leaderboard_stats", "upsert")).toHaveLength(1);
  });

  it("throws when the delete fails", async () => {
    db.on("strava_activities", { error: { message: "x" } }, { action: "delete" });
    await expect(deleteOneActivity(db, "u1", 55)).rejects.toEqual({ message: "x" });
  });
});

describe("advanceStravaBackfill()", () => {
  const fullPage = (oldestIso) =>
    Array.from({ length: 200 }, (_, i) => activity(i + 1, i === 199 ? oldestIso : "2026-03-01T00:00:00Z"));

  it("returns early without a token", async () => {
    getValidStravaAccessToken.mockResolvedValue(null);
    expect(await advanceStravaBackfill(db, "u1")).toEqual({ done: false, fetched: 0 });
  });

  it("returns done immediately for a member already backfilled", async () => {
    db.on("profiles", { data: { strava_backfill_done: true } }, { action: "select" });
    expect(await advanceStravaBackfill(db, "u1")).toEqual({ done: true, fetched: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumes from the stored watermark using the `before` cursor", async () => {
    db.on("profiles", { data: { strava_synced_through: "2025-06-01T00:00:00.000Z" } }, { action: "select" });
    fetchMock.mockResolvedValue(jsonResponse([]));
    await advanceStravaBackfill(db, "u1");
    const before = Date.parse("2025-06-01T00:00:00.000Z") / 1000;
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&before=${before}`
    );
  });

  it("walks pages, stepping the cursor one second past the oldest, until an empty page", async () => {
    db.on("profiles", { data: { strava_synced_through: null } }, { action: "select" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(fullPage("2025-01-01T00:00:10Z")))
      .mockResolvedValueOnce(jsonResponse([activity(999, "2024-12-01T00:00:00Z")]))
      .mockResolvedValueOnce(jsonResponse([]));
    const result = await advanceStravaBackfill(db, "u1");
    expect(result).toEqual({ done: true, fetched: 201 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain(`before=${Date.parse("2025-01-01T00:00:10Z") / 1000 - 1}`);
    const watermarks = db
      .queriesFor("profiles", "update")
      .filter((q) => "strava_synced_through" in q.payload)
      .map((q) => q.payload.strava_synced_through);
    expect(watermarks[0]).toBe("2025-01-01T00:00:09.000Z");
    expect(db.queriesFor("profiles", "update").some((q) => q.payload.strava_backfill_done === true)).toBe(true);
    expect(db.queriesFor("leaderboard_stats", "upsert")).toHaveLength(1);
  });

  // Regression: a short page used to end the walk and mark the member done
  // for good, so older history was never fetched (e.g. 1,382 km shown for
  // an athlete with 13,277 km year-to-date).
  it("keeps walking after a short page — only an empty page means done", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse([activity(1, "2025-05-01T00:00:00Z"), activity(2, "2025-04-01T00:00:00Z")]))
      .mockResolvedValueOnce(jsonResponse(fullPage("2024-01-01T00:00:00Z")))
      .mockResolvedValueOnce(jsonResponse([]));
    const result = await advanceStravaBackfill(db, "u1");
    expect(result).toEqual({ done: true, fetched: 202 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not mark a member done when a short page is the last thing it had time for", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock.mockResolvedValueOnce(jsonResponse([activity(1, "2025-05-01T00:00:00Z")]));
    const result = await advanceStravaBackfill(db, "u1", { maxPages: 1 });
    expect(result).toEqual({ done: false, fetched: 1 });
    expect(db.queriesFor("profiles", "update").some((q) => q.payload.strava_backfill_done === true)).toBe(false);
  });

  it("marks done when Strava returns an empty page", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock.mockResolvedValue(jsonResponse([]));
    expect(await advanceStravaBackfill(db, "u1")).toEqual({ done: true, fetched: 0 });
  });

  it("stops cleanly on a 429 without marking done", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 429 }));
    expect(await advanceStravaBackfill(db, "u1")).toEqual({ done: false, fetched: 0, rateLimited: true });
    expect(db.queriesFor("profiles", "update")).toHaveLength(0);
    expect(db.queriesFor("leaderboard_stats")).toHaveLength(0);
  });

  it("respects maxPages", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock.mockImplementation(async () => jsonResponse(fullPage("2025-01-01T00:00:00Z")));
    const result = await advanceStravaBackfill(db, "u1", { maxPages: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ done: false, fetched: 400 });
  });

  it("respects an already-passed deadline", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    const result = await advanceStravaBackfill(db, "u1", { deadline: Date.now() - 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ done: false, fetched: 0 });
  });

  it("still advances the cursor when an activity has no usable start_date", async () => {
    db.on("profiles", { data: { strava_synced_through: "2025-06-01T00:00:00.000Z" } }, { action: "select" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(fullPage("not a date")))
      .mockResolvedValueOnce(jsonResponse([]));
    await advanceStravaBackfill(db, "u1");
    const start = Date.parse("2025-06-01T00:00:00.000Z") / 1000;
    expect(fetchMock.mock.calls[1][0]).toContain(`before=${start - 1}`);
  });
});

describe("backfillRecentActivities()", () => {
  it("fetches a single page and never throws", async () => {
    getValidStravaAccessToken.mockRejectedValue(new Error("boom"));
    expect(await backfillRecentActivities(db, "u1")).toEqual({ done: false, fetched: 0 });
  });

  it("limits itself to one page", async () => {
    db.on("profiles", { data: {} }, { action: "select" });
    fetchMock.mockImplementation(async () =>
      jsonResponse(Array.from({ length: 200 }, (_, i) => activity(i, "2025-01-01T00:00:00Z")))
    );
    await backfillRecentActivities(db, "u1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("resetStravaBackfill()", () => {
  it("clears the watermark and done flag", async () => {
    await resetStravaBackfill(db, "u1");
    const [q] = db.queriesFor("profiles", "update");
    expect(q.payload).toEqual({ strava_synced_through: null, strava_backfill_done: false });
    expect(q.hasFilter("eq", "id", "u1")).toBe(true);
  });

  it("throws on error", async () => {
    db.on("profiles", { error: { message: "x" } }, { action: "update" });
    await expect(resetStravaBackfill(db, "u1")).rejects.toEqual({ message: "x" });
  });
});
