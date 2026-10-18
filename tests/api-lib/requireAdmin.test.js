import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { mockReq } from "../helpers/http.js";

vi.mock("../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import { requireAdmin } from "../../api-lib/requireAdmin.js";

let db;
const admin = { id: "admin-1", email: "Boss@RTG.com" };
const req = (token = "good-token") => mockReq({ headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
});

describe("requireAdmin()", () => {
  it("401 missing_token without a bearer token", async () => {
    expect(await requireAdmin(req(null))).toEqual({ ok: false, status: 401, error: "missing_token" });
  });

  it("500 server_misconfigured without the service-role client", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    expect(await requireAdmin(req())).toEqual({ ok: false, status: 500, error: "server_misconfigured" });
  });

  it("401 invalid_session for a bad token", async () => {
    db.signIn(admin, "another-token");
    expect(await requireAdmin(req())).toEqual({ ok: false, status: 401, error: "invalid_session" });
  });

  it("403 not_authorised for an account with no email", async () => {
    db.signIn({ id: "x", email: "" });
    expect(await requireAdmin(req())).toEqual({ ok: false, status: 403, error: "not_authorised" });
  });

  it("403 not_authorised when the email is not on the allowlist, even with an admin row", async () => {
    db.signIn(admin);
    db.on("admin_allowed_emails", { data: null });
    db.on("admin_profiles", { data: { id: "admin-1" } });
    expect(await requireAdmin(req())).toEqual({ ok: false, status: 403, error: "not_authorised" });
  });

  it("403 not_admin when allowlisted but no seat is held", async () => {
    db.signIn(admin);
    db.on("admin_allowed_emails", { data: { email: "boss@rtg.com" } });
    db.on("admin_profiles", { data: null });
    expect(await requireAdmin(req())).toEqual({ ok: false, status: 403, error: "not_admin" });
  });

  it("ok for an allowlisted admin, checking the lowercased email and the user id", async () => {
    db.signIn(admin);
    db.on("admin_allowed_emails", { data: { email: "boss@rtg.com" } });
    db.on("admin_profiles", { data: { id: "admin-1" } });
    const result = await requireAdmin(req());
    expect(result).toEqual({ ok: true, user: admin, supabaseAdmin: db });
    expect(db.queriesFor("admin_allowed_emails")[0].hasFilter("eq", "email", "boss@rtg.com")).toBe(true);
    expect(db.queriesFor("admin_profiles")[0].hasFilter("eq", "id", "admin-1")).toBe(true);
  });
});
