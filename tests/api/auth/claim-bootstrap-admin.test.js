import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import handler from "../../../api/auth/claim-bootstrap-admin.js";
import { ADMIN_EMAILS, isAdminAccount } from "../../../api-lib/adminEmails.js";

let db;
const confirmed = "2026-10-01T00:00:00Z";
// One of the fixed admin emails, typed with different case and spaces.
const user = { id: "u1", email: " Shub88510@Gmail.com ", email_confirmed_at: confirmed, user_metadata: { full_name: "New Admin" } };

function call({ method = "POST", token = "good-token" } = {}) {
  const res = mockRes();
  return handler(mockReq({ method, headers: token ? { authorization: `Bearer ${token}` } : {} }), res).then(() => res);
}

beforeEach(() => {
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  db.signIn(user);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the fixed admin email list", () => {
  it("is exactly the 3 addresses the owner gave", () => {
    expect([...ADMIN_EMAILS]).toEqual(["simranbaghelgame@gmail.com", "shub88510@gmail.com", "wheelikx@gmail.com"]);
  });

  it("needs the email to be confirmed", () => {
    expect(isAdminAccount({ email: "wheelikx@gmail.com", email_confirmed_at: confirmed })).toBe(true);
    expect(isAdminAccount({ email: "wheelikx@gmail.com" })).toBe(false);
    expect(isAdminAccount({ email: "wheelikx@gmail.co", email_confirmed_at: confirmed })).toBe(false);
  });
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

  it("403 not_admin_email for any other account — and writes nothing", async () => {
    db.signIn({ ...user, email: "first.visitor@example.com" });
    const res = await call();
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe("not_admin_email");
    expect(db.queriesFor("admin_profiles")).toHaveLength(0);
    expect(db.queriesFor("profiles")).toHaveLength(0);
  });

  it("403 email_not_confirmed for an admin email whose owner hasn't confirmed it", async () => {
    db.signIn({ ...user, email_confirmed_at: null });
    const res = await call();
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe("email_not_confirmed");
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("confirms an existing admin without inserting", async () => {
    db.on("admin_profiles", { data: { id: "u1" } }, { action: "select" });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true, alreadyAdmin: true });
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("makes an admin email an admin on its first sign-in", async () => {
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ granted: true });
    expect(db.queriesFor("admin_profiles", "insert")[0].payload).toEqual({ id: "u1", full_name: "New Admin" });
  });

  it("uses Google's `name` when there is no full_name", async () => {
    db.signIn({ ...user, user_metadata: { name: "Google Name" } });
    await call();
    expect(db.queriesFor("admin_profiles", "insert")[0].payload).toEqual({ id: "u1", full_name: "Google Name" });
  });

  it("creates a missing profiles row before the admin row (admin_profiles has a foreign key to it)", async () => {
    await call();
    const upsert = db.queriesFor("profiles", "upsert")[0];
    expect(upsert.payload).toEqual({ id: "u1", email: user.email, full_name: "New Admin" });
    expect(upsert.options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    const order = db.queries.map((q) => `${q.table}:${q.action}`);
    expect(order.indexOf("profiles:upsert")).toBeLessThan(order.indexOf("admin_profiles:insert"));
  });

  it("reports grant_failed and inserts no admin row when the profiles row can't be created", async () => {
    db.on("profiles", { error: { message: "profiles exploded" } }, { action: "upsert" });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ granted: false, reason: "grant_failed" });
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("503 admin_check_failed when the admin lookup itself fails", async () => {
    db.on("admin_profiles", { error: { message: "db down" } }, { action: "select" });
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(res.body.reason).toBe("admin_check_failed");
    expect(db.queriesFor("admin_profiles", "insert")).toHaveLength(0);
  });

  it("maps a refused insert (e.g. the database's admin email guard) to 500 grant_failed", async () => {
    db.on("admin_profiles", { error: { message: "Only the RTG admin email addresses can be admins." } }, { action: "insert" });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ granted: false, reason: "grant_failed" });
  });
});
