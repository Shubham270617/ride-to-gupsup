import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import handler from "../../../api/auth/claim-bootstrap-admin.js";

let db;
const user = { id: "u1", email: "New.Admin@RTG.com", user_metadata: { full_name: "New Admin" } };

function call({ method = "POST", token = "good-token" } = {}) {
  const res = mockRes();
  return handler(mockReq({ method, headers: token ? { authorization: `Bearer ${token}` } : {} }), res).then(() => res);
}

beforeEach(() => {
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  db.signIn(user);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/auth/claim-bootstrap-admin", () => {
  it("405 for non-POST", async () => {
    expect((await call({ method: "GET" })).statusCode).toBe(405);
  });

  it("401 without a token", async () => {
    const res = await call({ token: null });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "missing_token" });
  });

  it("500 without the service-role client", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    expect((await call()).statusCode).toBe(500);
  });

  it("401 for an invalid session", async () => {
    const res = await call({ token: "forged" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_session" });
  });

  it("confirms an existing admin without inserting", async () => {
    db.on("admin_profiles", { data: { id: "u1" } }, { action: "select" });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true, alreadyAdmin: true });
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("gives a free seat to any signed-in account — no email list involved", async () => {
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true });
    expect(db.queriesFor("admin_profiles", "insert")[0].payload).toEqual({ id: "u1", full_name: "New Admin" });
    expect(db.queriesFor("admin_allowed_emails")).toHaveLength(0);
  });

  it("uses Google's `name` when there is no full_name", async () => {
    db.signIn({ id: "u3", email: "g@x.com", user_metadata: { name: "Google Name" } });
    await call();
    expect(db.queriesFor("admin_profiles", "insert")[0].payload).toEqual({ id: "u3", full_name: "Google Name" });
  });

  it("creates a missing profiles row before granting the seat (admin_profiles has a foreign key to it)", async () => {
    const res = await call();
    expect(res.body).toEqual({ granted: true });
    const [upsert] = db.queriesFor("profiles", "upsert");
    expect(upsert.payload).toEqual({ id: "u1", email: "New.Admin@RTG.com", full_name: "New Admin" });
    expect(upsert.options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    const order = db.queries.map((q) => `${q.table}:${q.action}`);
    expect(order.indexOf("profiles:upsert")).toBeLessThan(order.indexOf("admin_profiles:insert"));
  });

  it("reports grant_failed and inserts no seat when the profiles row can't be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.on("profiles", { error: { message: "rls" } }, { action: "upsert" });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ granted: false, reason: "grant_failed", message: "rls" });
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("maps the seat-cap trigger error (all 3 seats taken) to 409 seats_full", async () => {
    db.on("admin_profiles", { error: { message: "Admin seat cap of 3 reached — remove an existing admin first." } }, { action: "insert" });
    const res = await call();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ granted: false, reason: "seats_full" });
  });

  it("maps any other insert error to 500 grant_failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.on("admin_profiles", { error: { message: "boom" } }, { action: "insert" });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ granted: false, reason: "grant_failed", message: "boom" });
  });
});
