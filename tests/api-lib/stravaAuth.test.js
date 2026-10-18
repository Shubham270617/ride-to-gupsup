import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { jsonResponse } from "../helpers/http.js";
import { getValidStravaAccessToken } from "../../api-lib/stravaAuth.js";
import { destroyStorageAsset } from "../../api-lib/storageDestroy.js";

let db;
let fetchMock;

beforeEach(() => {
  db = createFakeSupabase();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("STRAVA_CLIENT_ID", "cid");
  vi.stubEnv("STRAVA_CLIENT_SECRET", "secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

describe("getValidStravaAccessToken()", () => {
  it("returns null for a member without a refresh token", async () => {
    db.on("profiles", { data: { strava_refresh_token: null } });
    expect(await getValidStravaAccessToken(db, "u1")).toBeNull();
  });

  it("returns null when the profile read fails", async () => {
    db.on("profiles", { error: { message: "x" } });
    expect(await getValidStravaAccessToken(db, "u1")).toBeNull();
  });

  it("reuses a token with more than 5 minutes left", async () => {
    db.on("profiles", {
      data: { strava_access_token: "live", strava_refresh_token: "r1", strava_token_expires_at: inMinutes(30) },
    });
    expect(await getValidStravaAccessToken(db, "u1")).toBe("live");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes a token expiring within 5 minutes and stores the rotated refresh token conditionally", async () => {
    db.on(
      "profiles",
      { data: { strava_access_token: "old", strava_refresh_token: "r1", strava_token_expires_at: inMinutes(2) } },
      { action: "select" }
    );
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "new", refresh_token: "r2", expires_at: 1900000000 }));
    expect(await getValidStravaAccessToken(db, "u1")).toBe("new");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://www.strava.com/api/v3/oauth/token");
    expect(JSON.parse(init.body)).toEqual({
      client_id: "cid",
      client_secret: "secret",
      grant_type: "refresh_token",
      refresh_token: "r1",
    });
    const [update] = db.queriesFor("profiles", "update");
    expect(update.payload).toEqual({
      strava_access_token: "new",
      strava_refresh_token: "r2",
      strava_token_expires_at: new Date(1900000000 * 1000).toISOString(),
    });
    // only replaces the token it read — a racing refresh can't be overwritten
    expect(update.hasFilter("eq", "strava_refresh_token", "r1")).toBe(true);
  });

  it("treats a missing expiry as expired", async () => {
    db.on("profiles", { data: { strava_access_token: "old", strava_refresh_token: "r1" } }, { action: "select" });
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "new", refresh_token: "r2", expires_at: 1 }));
    expect(await getValidStravaAccessToken(db, "u1")).toBe("new");
  });

  it("returns null when Strava refuses the refresh", async () => {
    db.on("profiles", { data: { strava_refresh_token: "r1", strava_token_expires_at: inMinutes(-10) } });
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 401 }));
    expect(await getValidStravaAccessToken(db, "u1")).toBeNull();
  });
});

describe("destroyStorageAsset()", () => {
  it("removes the object path parsed from a public rtg-media URL", async () => {
    await destroyStorageAsset(
      db,
      "https://p.supabase.co/storage/v1/object/public/rtg-media/site/hero%20photo.jpg"
    );
    expect(db.storage.from).toHaveBeenCalledWith("rtg-media");
    expect(db.storage.remove).toHaveBeenCalledWith(["site/hero photo.jpg"]);
  });

  it("ignores URLs that aren't rtg-media storage URLs", async () => {
    await destroyStorageAsset(db, "https://images.unsplash.com/photo-1");
    await destroyStorageAsset(db, null);
    expect(db.storage.remove).not.toHaveBeenCalled();
  });

  it("throws when storage refuses", async () => {
    db.storage.remove.mockResolvedValue({ error: { message: "denied" } });
    await expect(
      destroyStorageAsset(db, "https://p.supabase.co/storage/v1/object/public/rtg-media/a.jpg")
    ).rejects.toThrow("denied");
  });
});
