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

  it("403 for an account that is not on the allowlist — and grants nothing", async () => {
    db.on("admin_allowed_emails", { data: null });
    const res = await call();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ granted: false, reason: "not_authorised" });
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
    expect(db.queriesFor("admin_allowed_emails")[0].hasFilter("eq", "email", "new.admin@rtg.com")).toBe(true);
  });

  it("500 query_failed when the allowlist lookup errors", async () => {
    db.on("admin_allowed_emails", { error: { message: "boom" } });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "query_failed", message: "boom" });
  });

  it("grants a seat to an allowlisted account", async () => {
    db.on("admin_allowed_emails", { data: { email: "new.admin@rtg.com" } });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true });
    expect(db.queriesFor("admin_profiles", "insert")[0].payload).toEqual({ id: "u1", full_name: "New Admin" });
  });

  it("maps the seat-cap trigger error to 409 seats_full", async () => {
    db.on("admin_allowed_emails", { data: { email: "new.admin@rtg.com" } });
    db.on("admin_profiles", { error: { message: "Admin seat cap reached (3)" } }, { action: "insert" });
    const res = await call();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ granted: false, reason: "seats_full" });
  });

  it("maps any other insert error to 500 grant_failed", async () => {
    db.on("admin_allowed_emails", { data: { email: "new.admin@rtg.com" } });
    db.on("admin_profiles", { error: { message: "not on allowlist" } }, { action: "insert" });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ granted: false, reason: "grant_failed", message: "not on allowlist" });
  });
});
