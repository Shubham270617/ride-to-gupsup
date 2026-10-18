import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("../../../api-lib/stravaSync.js", () => ({ syncOneActivity: vi.fn(), deleteOneActivity: vi.fn() }));

import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import { deleteOneActivity, syncOneActivity } from "../../../api-lib/stravaSync.js";
import handler from "../../../api/webhooks/strava.js";

let db;

function call(req) {
  const res = mockRes();
  return handler(req, res).then(() => res);
}
const handshake = (query) => call(mockReq({ method: "GET", query }));
const event = (body) => call(mockReq({ method: "POST", body }));

beforeEach(() => {
  vi.clearAllMocks();
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "verify-me");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET — subscription handshake", () => {
  it("echoes hub.challenge for the right verify token", async () => {
    const res = await handshake({ "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "c-123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ "hub.challenge": "c-123" });
  });

  it.each([
    [{ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "c" }],
    [{ "hub.mode": "unsubscribe", "hub.verify_token": "verify-me", "hub.challenge": "c" }],
    [{ "hub.challenge": "c" }],
  ])("403 for %j", async (query) => {
    const res = await handshake(query);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "verification_failed" });
  });

  // Regression for a bug found while testing: with
  // STRAVA_WEBHOOK_VERIFY_TOKEN unset, a request with no hub.verify_token
  // compared undefined === undefined and passed the handshake.
  it("403 when the verify token is not configured, even if the request omits it", async () => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "");
    delete process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    const res = await handshake({ "hub.mode": "subscribe", "hub.challenge": "c" });
    expect(res.statusCode).toBe(403);
  });
});

describe("POST — events", () => {
  it("405 for other methods", async () => {
    const res = await call(mockReq({ method: "PUT" }));
    expect(res.statusCode).toBe(405);
  });

  it("acknowledges non-activity events without touching the database", async () => {
    const res = await event({ object_type: "athlete", aspect_type: "update", owner_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(db.queries).toHaveLength(0);
  });

  it("acknowledges an empty body", async () => {
    expect((await event(undefined)).statusCode).toBe(200);
  });

  it("syncs a create/update for a connected athlete", async () => {
    db.on("profiles", { data: { id: "member-1" } });
    const res = await event({ object_type: "activity", aspect_type: "create", object_id: 55, owner_id: 777 });
    expect(res.body).toEqual({ received: true });
    expect(db.queriesFor("profiles")[0].hasFilter("eq", "strava_athlete_id", 777)).toBe(true);
    expect(syncOneActivity).toHaveBeenCalledWith(db, "member-1", 55);
    expect(deleteOneActivity).not.toHaveBeenCalled();
  });

  it("deletes on a delete event", async () => {
    db.on("profiles", { data: { id: "member-1" } });
    await event({ object_type: "activity", aspect_type: "delete", object_id: 55, owner_id: 777 });
    expect(deleteOneActivity).toHaveBeenCalledWith(db, "member-1", 55);
    expect(syncOneActivity).not.toHaveBeenCalled();
  });

  it("acknowledges events for athletes we don't know", async () => {
    db.on("profiles", { data: null });
    const res = await event({ object_type: "activity", aspect_type: "create", object_id: 1, owner_id: 2 });
    expect(res.statusCode).toBe(200);
    expect(syncOneActivity).not.toHaveBeenCalled();
  });

  it("500 so Strava redelivers when the sync fails", async () => {
    db.on("profiles", { data: { id: "member-1" } });
    syncOneActivity.mockRejectedValue(new Error("token refresh blip"));
    const res = await event({ object_type: "activity", aspect_type: "update", object_id: 1, owner_id: 2 });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "sync_failed" });
  });

  it("500 server_misconfigured without Supabase", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    const res = await event({ object_type: "activity", aspect_type: "create", object_id: 1, owner_id: 2 });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "server_misconfigured" });
  });

  // SECURITY (not fixed — needs a design decision): Strava does not sign
  // webhook POSTs and this handler doesn't check subscription_id or confirm
  // with Strava, so anyone who knows a member's public Strava athlete id and
  // an activity id can POST a forged "delete" and remove that activity from
  // the member's leaderboard totals.
  it.todo("rejects forged delete events (check subscription_id, or confirm the activity is really gone on Strava)");
});
