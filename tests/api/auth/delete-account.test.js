import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../../api-lib/supabaseAdmin.js";
import handler from "../../../api/auth/delete-account.js";

let db;

function call({ method = "POST", token = "good-token", body } = {}) {
  const res = mockRes();
  return handler(mockReq({ method, body, headers: token ? { authorization: `Bearer ${token}` } : {} }), res).then(
    () => res
  );
}

beforeEach(() => {
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  db.signIn({ id: "me", email: "me@example.com" });
});

describe("POST /api/auth/delete-account", () => {
  it("405 for non-POST", async () => {
    expect((await call({ method: "DELETE" })).statusCode).toBe(405);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("401 without a token", async () => {
    expect((await call({ token: null })).statusCode).toBe(401);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("500 without the service-role client", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    expect((await call()).statusCode).toBe(500);
  });

  it("401 for an invalid session — nothing deleted", async () => {
    const res = await call({ token: "stolen-but-expired" });
    expect(res.statusCode).toBe(401);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes only the caller's own account, ignoring any id in the body", async () => {
    const res = await call({ body: { userId: "someone-else" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.auth.admin.deleteUser).toHaveBeenCalledWith("me");
  });

  it("500 delete_failed when Supabase refuses", async () => {
    db.auth.admin.deleteUser.mockResolvedValue({ error: { message: "nope" } });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "delete_failed", message: "nope" });
  });
});
