import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";
vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));
import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import handler from "../../../api/auth/claim-bootstrap-admin.js";
let db;
const user = { id: "u1", email: "member@example.test", user_metadata: { full_name: "Member" } };
async function call({ method = "POST", token = "good-token", body, query = {} } = {}) {
  const res = mockRes();
  await handler(mockReq({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body, query }), res);
  return res;
}
beforeEach(() => {
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  db.signIn(user);
});
afterEach(() => {
  // Every tested path must be strictly read-only, including denial and errors.
  expect(db.queries.filter((q) => q.action !== "select")).toHaveLength(0);
});
describe("admin claim is confirmation-only", () => {
  it("rejects non-POST", async () => { expect((await call({ method: "GET" })).statusCode).toBe(405); });
  it("rejects a missing token before looking up membership", async () => {
    expect((await call({ token: null })).body).toEqual({ error: "missing_token" });
    expect(db.queries).toHaveLength(0);
  });
  it("rejects a forged token", async () => { expect((await call({ token: "forged" })).statusCode).toBe(401); });
  it("fails closed without server credentials", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    expect((await call()).body).toEqual({ error: "server_misconfigured" });
  });
  it("preserves an existing admin and checks the validated identity", async () => {
    db.on("admin_profiles", { data: { id: user.id } }, { action: "select" });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true, alreadyAdmin: true });
    expect(db.queriesFor("admin_profiles", "select")[0].hasFilter("eq", "id", user.id)).toBe(true);
  });
  it("denies an ordinary authenticated member even with an empty admin table", async () => {
    const res = await call();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ granted: false, reason: "not_admin" });
    expect(db.queriesFor("profiles")).toHaveLength(0);
  });
  it("does not trust role-like user metadata", async () => {
    db.signIn({ ...user, user_metadata: { role: "admin", is_admin: true, full_name: "Administrator" } });
    expect((await call()).statusCode).toBe(403);
  });
  it("does not trust an admin flag, another user id, or an email in the request", async () => {
    const res = await call({ body: { id: "approved-other-user", role: "admin", email: "admin@example.test" }, query: { admin: "1" } });
    expect(res.statusCode).toBe(403);
    expect(db.queriesFor("admin_profiles", "select")[0].hasFilter("eq", "id", user.id)).toBe(true);
  });
  it("does not re-grant a seat after membership is revoked", async () => {
    db.on("admin_profiles", { data: { id: user.id } }, { action: "select", times: 1 });
    expect((await call()).statusCode).toBe(200);
    expect((await call()).statusCode).toBe(403);
    expect((await call()).statusCode).toBe(403);
  });
  it("denies multiple concurrent unapproved claims", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => call()));
    expect(results.every((res) => res.statusCode === 403)).toBe(true);
  });
  it("fails closed on membership read errors without leaking database details", async () => {
    db.on("admin_profiles", { error: { message: "private database details" } }, { action: "select" });
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ granted: false, reason: "admin_check_failed" });
    expect(JSON.stringify(res.body)).not.toContain("private database details");
  });
  it("does not accept data accompanied by a database error", async () => {
    db.on("admin_profiles", { data: { id: user.id }, error: { message: "failed" } }, { action: "select" });
    expect((await call()).statusCode).toBe(503);
  });
});
