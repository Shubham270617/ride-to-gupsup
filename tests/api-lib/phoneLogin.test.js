import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { mockReq, mockRes } from "../helpers/http.js";

const anonClient = vi.hoisted(() => ({ auth: { signInWithPassword: null } }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => anonClient) }));
vi.mock("../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import handler from "../../api-lib/phoneLogin.js";

let db;

function call(body, method = "POST") {
  const res = mockRes();
  return handler(mockReq({ method, body }), res).then(() => res);
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  anonClient.auth.signInWithPassword = vi.fn();
});

describe("phoneLogin", () => {
  it("rejects non-POST", async () => {
    expect((await call({}, "GET")).statusCode).toBe(405);
  });

  it.each([[{}], [{ phone: "9999999999" }], [{ password: "pw" }], [undefined]])(
    "400 missing_fields for %j",
    async (body) => {
      const res = await call(body);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "missing_fields" });
    }
  );

  it("500 when the server is not configured", async () => {
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const res = await call({ phone: "1", password: "p" });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "server_misconfigured" });
  });

  it("500 when there is no admin client", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    const res = await call({ phone: "1", password: "p" });
    expect(res.statusCode).toBe(500);
  });

  it("401 invalid_credentials for an unknown phone, without trying a password", async () => {
    db.on("profiles", { data: null });
    const res = await call({ phone: "9999999999", password: "secret123" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
    expect(anonClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("looks the phone up exactly and signs in with that profile's email", async () => {
    db.on("profiles", { data: { email: "asha@example.com" } });
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "at", refresh_token: "rt" } },
      error: null,
    });
    const res = await call({ phone: "+919999999999", password: "secret123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ access_token: "at", refresh_token: "rt" });
    const [lookup] = db.queriesFor("profiles", "select");
    expect(lookup.hasFilter("eq", "phone", "+919999999999")).toBe(true);
    expect(lookup.maybeSingle).toBe(true);
    expect(anonClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "asha@example.com",
      password: "secret123",
    });
    expect(createClient).toHaveBeenCalledWith("https://proj.supabase.co", "anon-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it("answers a wrong password exactly like an unknown phone", async () => {
    db.on("profiles", { data: { email: "asha@example.com" } });
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const res = await call({ phone: "1", password: "wrong" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("treats a duplicate phone (maybeSingle error) as invalid_credentials", async () => {
    // profiles.phone is not unique in schema.sql, so two members sharing a
    // number make maybeSingle() error — neither of them can log in by phone.
    db.on("profiles", { data: null, error: { message: "multiple rows returned" } });
    const res = await call({ phone: "1", password: "p" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });
});
