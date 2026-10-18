import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { jsonResponse, mockReq, mockRes } from "../helpers/http.js";

vi.mock("../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import handler, { resetEmail } from "../../api-lib/passwordReset.js";

const SECRET = "test-otp-secret";
const TABLE = "password_reset_codes";
const EMAIL = "rider@example.com";

const hmac = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const codeHash = (email, code) => hmac(`code:${email}:${code}`);
const linkHash = (token) => hmac(`link:${token}`);

let db;
let fetchMock;

function call(body, { headers, remoteAddress = "10.0.0.1", method = "POST" } = {}) {
  const req = mockReq({ method, body, headers, remoteAddress, query: { op: "password-reset" } });
  const res = mockRes();
  return handler(req, res).then(() => res);
}

// Wires the queries requestReset() makes, in the shape it expects.
function setupRequest({ recent = [], ipCount = 0, userId = "user-1", insertError = null } = {}) {
  db.on(TABLE, { data: recent }, { action: "select", match: (q) => q.columns === "created_at" });
  db.on(TABLE, { count: ipCount }, { action: "select", match: (q) => q.selectOptions?.head === true });
  db.on("profiles", { data: userId ? [{ id: userId }] : [] }, { action: "select" });
  db.on(TABLE, { data: null }, { action: "update" });
  db.on(TABLE, insertError ? { error: insertError } : { data: { id: "row-1" } }, { action: "insert" });
}

// Wires findActiveRow() for the code path.
function setupCodeRow(row, { counted = true } = {}) {
  db.on(TABLE, { data: row ? [row] : [] }, { action: "select", match: (q) => q.hasFilter("eq", "email") });
  db.on(
    TABLE,
    (q) => ({ data: counted ? [{ id: q.filterValue("eq", "id") }] : [] }),
    { action: "update", match: (q) => q.payload && "attempts" in q.payload }
  );
}

const liveRow = (overrides = {}) => ({
  id: "row-1",
  email: EMAIL,
  user_id: "user-1",
  code_hash: codeHash(EMAIL, "123456"),
  attempts: 0,
  ...overrides,
});

beforeEach(() => {
  vi.stubEnv("OTP_SECRET", SECRET);
  vi.stubEnv("BREVO_API_KEY", "brevo-key");
  vi.stubEnv("MAIL_FROM_EMAIL", "no-reply@rideteagupshup.com");
  vi.stubEnv("FRONTEND_URL", "https://rideteagupshup.com/");
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  fetchMock = vi.fn(async () => jsonResponse({ messageId: "m1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const sentEmail = () => JSON.parse(fetchMock.mock.calls[0][1].body);

describe("passwordReset handler — guards", () => {
  it("rejects anything but POST with 405", async () => {
    const res = await call({ action: "request", email: EMAIL }, { method: "GET" });
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "method_not_allowed" });
  });

  it.each([
    ["no Supabase admin client", () => getSupabaseAdmin.mockReturnValue(null)],
    ["no OTP_SECRET", () => vi.stubEnv("OTP_SECRET", "")],
    ["no BREVO_API_KEY", () => vi.stubEnv("BREVO_API_KEY", "")],
    ["no MAIL_FROM_EMAIL", () => vi.stubEnv("MAIL_FROM_EMAIL", "")],
  ])("returns 500 server_misconfigured with %s", async (_label, breakIt) => {
    breakIt();
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "server_misconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown action with 400", async () => {
    const res = await call({ action: "explode" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "unknown_action" });
  });

  it("treats a missing body as an unknown action", async () => {
    const res = await call(undefined);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "unknown_action" });
  });

  it("turns a database error into a generic 500 without leaking it", async () => {
    db.on(TABLE, { error: { message: "relation does not exist" } }, { action: "select" });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "unexpected_error" });
  });
});

describe("action: request", () => {
  it.each(["", "not-an-email", "a@b", "two@@example.com", "spaces in@example.com", 42, null])(
    "rejects invalid email %j",
    async (email) => {
      const res = await call({ action: "request", email });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "invalid_email" });
      expect(db.queries).toHaveLength(0);
    }
  );

  it("rejects an address longer than 254 characters", async () => {
    const res = await call({ action: "request", email: `${"a".repeat(250)}@example.com` });
    expect(res.body).toEqual({ error: "invalid_email" });
  });

  it("sends one email with a 6-digit code and a link, storing only HMACs", async () => {
    setupRequest();
    const res = await call({ action: "request", email: "  Rider@Example.COM " });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Brevo request
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const mail = sentEmail();
    expect(mail.to).toEqual([{ email: EMAIL }]);
    const code = mail.subject.match(/^(\d{6}) is your RTG password reset code$/)[1];
    const token = mail.textContent.match(/reset-password\?token=([\w-]+)/)[1];
    // trailing slash on FRONTEND_URL is trimmed
    expect(mail.textContent).toContain(`https://rideteagupshup.com/reset-password?token=${token}`);
    expect(init.headers["api-key"]).toBe("brevo-key");

    // Stored row: hashes only, normalized email, IP recorded, 30 min expiry
    const [insert] = db.queriesFor(TABLE, "insert");
    expect(insert.payload).toMatchObject({
      email: EMAIL,
      user_id: "user-1",
      code_hash: codeHash(EMAIL, code),
      link_hash: linkHash(token),
      request_ip: "10.0.0.1",
    });
    expect(JSON.stringify(insert.payload)).not.toContain(code === "000000" ? "never" : `"${code}"`);
    expect(JSON.stringify(insert.payload)).not.toContain(token);
    const ttl = new Date(insert.payload.expires_at).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(29 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it("retires older live codes for the address before inserting the new one", async () => {
    setupRequest();
    await call({ action: "request", email: EMAIL });
    const order = db.queries.filter((q) => q.table === TABLE).map((q) => q.action);
    expect(order.indexOf("update")).toBeLessThan(order.indexOf("insert"));
    const [retire] = db.queriesFor(TABLE, "update");
    expect(retire.payload).toHaveProperty("consumed_at");
    expect(retire.hasFilter("eq", "email", EMAIL)).toBe(true);
    expect(retire.hasFilter("is", "consumed_at", null)).toBe(true);
  });

  it("uses the first x-forwarded-for address as the client IP", async () => {
    setupRequest();
    await call({ action: "request", email: EMAIL }, { headers: { "x-forwarded-for": "203.0.113.9, 10.1.1.1" } });
    const ipQuery = db.queries.find((q) => q.selectOptions?.head);
    expect(ipQuery.filterValue("eq", "request_ip")).toBe("203.0.113.9");
    expect(db.queriesFor(TABLE, "insert")[0].payload.request_ip).toBe("203.0.113.9");
  });

  it("skips the per-IP check when no IP is known", async () => {
    setupRequest();
    const res = await call({ action: "request", email: EMAIL }, { remoteAddress: null });
    expect(res.body).toEqual({ ok: true });
    expect(db.queries.some((q) => q.selectOptions?.head)).toBe(false);
  });

  it("enforces the 45s cooldown with a retryAfter in seconds", async () => {
    setupRequest({ recent: [{ created_at: new Date(Date.now() - 10_000).toISOString() }] });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toBe("too_soon");
    expect(res.body.retryAfter).toBeGreaterThanOrEqual(34);
    expect(res.body.retryAfter).toBeLessThanOrEqual(35);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.queriesFor(TABLE, "insert")).toHaveLength(0);
  });

  it("allows a new request once the cooldown has passed", async () => {
    setupRequest({ recent: [{ created_at: new Date(Date.now() - 46_000).toISOString() }] });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.body).toEqual({ ok: true });
  });

  it("caps requests at 5 per email per hour", async () => {
    const old = (mins) => ({ created_at: new Date(Date.now() - mins * 60_000).toISOString() });
    setupRequest({ recent: [old(2), old(10), old(20), old(30), old(40)] });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "too_many_requests" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows the 5th request in an hour", async () => {
    const old = (mins) => ({ created_at: new Date(Date.now() - mins * 60_000).toISOString() });
    setupRequest({ recent: [old(2), old(10), old(20), old(30)] });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.body).toEqual({ ok: true });
  });

  it("only counts the last hour of requests", async () => {
    setupRequest();
    await call({ action: "request", email: EMAIL });
    const recentQ = db.queries.find((q) => q.columns === "created_at");
    const since = new Date(recentQ.filterValue("gte", "created_at")).getTime();
    expect(Date.now() - since).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
    expect(Date.now() - since).toBeLessThan(60 * 60 * 1000 + 1000);
  });

  it("caps requests at 15 per IP per hour", async () => {
    setupRequest({ ipCount: 15 });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "too_many_requests" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows the 15th request from one IP", async () => {
    setupRequest({ ipCount: 14 });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.body).toEqual({ ok: true });
  });

  it("answers ok for an unknown address without sending, but still writes a row", async () => {
    setupRequest({ userId: null });
    const res = await call({ action: "request", email: "nobody@example.com" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    const [insert] = db.queriesFor(TABLE, "insert");
    expect(insert.payload).toMatchObject({ email: "nobody@example.com", request_ip: "10.0.0.1" });
    expect(insert.payload.user_id).toBeUndefined();
    expect(insert.payload.code_hash).toBeUndefined();
    expect(insert.payload.link_hash).toBeUndefined();
  });

  it("never emails a synthetic @members. address and never looks it up", async () => {
    setupRequest({ userId: "should-not-be-used" });
    const res = await call({ action: "request", email: "strava_123@members.rideteagupshup.com" });
    expect(res.body).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.queriesFor("profiles")).toHaveLength(0);
    expect(db.queriesFor(TABLE, "insert")).toHaveLength(1);
  });

  it("responds identically for known and unknown addresses", async () => {
    setupRequest({ userId: "user-1" });
    const known = await call({ action: "request", email: EMAIL });
    db = createFakeSupabase();
    getSupabaseAdmin.mockReturnValue(db);
    setupRequest({ userId: null });
    const unknown = await call({ action: "request", email: "ghost@example.com" });
    expect(known.statusCode).toBe(unknown.statusCode);
    expect(known.body).toEqual(unknown.body);
  });

  it("returns 502 and retires the row when Brevo fails", async () => {
    setupRequest();
    fetchMock.mockResolvedValue(jsonResponse("bad sender", { status: 400 }));
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "send_failed" });
    const updates = db.queriesFor(TABLE, "update");
    const retire = updates.find((q) => q.hasFilter("eq", "id", "row-1"));
    expect(retire).toBeDefined();
    expect(retire.payload.consumed_at).toEqual(expect.any(String));
  });

  it("returns 502 when the network call to Brevo throws", async () => {
    setupRequest();
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(502);
  });

  it("returns 500 when the insert fails, without sending", async () => {
    setupRequest({ insertError: { message: "insert failed" } });
    const res = await call({ action: "request", email: EMAIL });
    expect(res.statusCode).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("generates codes that are always exactly 6 digits (zero-padded)", async () => {
    const spy = vi.spyOn(crypto, "randomInt").mockReturnValue(42);
    setupRequest();
    await call({ action: "request", email: EMAIL });
    expect(sentEmail().subject).toBe("000042 is your RTG password reset code");
    spy.mockRestore();
  });
});

describe("action: verify (code)", () => {
  it("accepts the right code and counts the check", async () => {
    setupCodeRow(liveRow());
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, email: EMAIL });
    const [count] = db.queriesFor(TABLE, "update");
    expect(count.payload).toEqual({ attempts: 1 });
    // optimistic concurrency: conditioned on the value read
    expect(count.hasFilter("eq", "attempts", 0)).toBe(true);
    expect(count.hasFilter("eq", "id", "row-1")).toBe(true);
  });

  it("normalizes the email and strips non-digits from the code", async () => {
    setupCodeRow(liveRow());
    const res = await call({ action: "verify", email: " RIDER@example.com", code: "123 456" });
    expect(res.body).toEqual({ ok: true, email: EMAIL });
  });

  it("only looks at live rows: unconsumed, with a user, unexpired, newest first", async () => {
    setupCodeRow(liveRow());
    await call({ action: "verify", email: EMAIL, code: "123456" });
    const [select] = db.queriesFor(TABLE, "select");
    expect(select.hasFilter("is", "consumed_at", null)).toBe(true);
    expect(select.filters).toContainEqual({ op: "not", column: "user_id", value: ["is", null] });
    expect(select.filters.some((f) => f.op === "gt" && f.column === "expires_at")).toBe(true);
    expect(select.order).toContainEqual(expect.objectContaining({ column: "created_at", ascending: false }));
    expect(select.limit).toBe(1);
  });

  it("rejects a wrong code with invalid_code (and still counts it)", async () => {
    setupCodeRow(liveRow({ attempts: 2 }));
    const res = await call({ action: "verify", email: EMAIL, code: "654321" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "invalid_code" });
    expect(db.queriesFor(TABLE, "update")[0].payload).toEqual({ attempts: 3 });
  });

  it("does not accept another address's code", async () => {
    setupCodeRow(liveRow({ code_hash: codeHash("other@example.com", "123456") }));
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.body).toEqual({ error: "invalid_code" });
  });

  it.each([["12345"], ["1234567"], [""], [123456], [undefined]])("rejects malformed code %j without a query", async (code) => {
    const res = await call({ action: "verify", email: EMAIL, code });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "invalid_code" });
    expect(db.queries).toHaveLength(0);
  });

  it("rejects a missing email", async () => {
    const res = await call({ action: "verify", code: "123456" });
    expect(res.body).toEqual({ error: "invalid_code" });
  });

  it("returns invalid_code when there is no live row", async () => {
    setupCodeRow(null);
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.body).toEqual({ error: "invalid_code" });
    expect(db.queriesFor(TABLE, "update")).toHaveLength(0);
  });

  it("refuses with too_many_attempts once 8 checks are used, even with the right code", async () => {
    setupCodeRow(liveRow({ attempts: 8 }));
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "too_many_attempts" });
    expect(db.queriesFor(TABLE, "update")).toHaveLength(0);
  });

  it("reports too_many_attempts on the wrong guess that uses up the last check", async () => {
    setupCodeRow(liveRow({ attempts: 7 }));
    const res = await call({ action: "verify", email: EMAIL, code: "000000" });
    expect(res.body).toEqual({ error: "too_many_attempts" });
  });

  it("accepts the right code on the last allowed check", async () => {
    setupCodeRow(liveRow({ attempts: 7 }));
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.body).toEqual({ ok: true, email: EMAIL });
  });

  it("returns invalid_code when a parallel check won the attempt race (even for the right code)", async () => {
    setupCodeRow(liveRow({ attempts: 3 }), { counted: false });
    const res = await call({ action: "verify", email: EMAIL, code: "123456" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "invalid_code" });
  });
});

describe("action: verify (link token)", () => {
  it("accepts a valid link token and returns its email", async () => {
    db.on(TABLE, (q) => ({ data: q.filterValue("eq", "link_hash") === linkHash("tok-abc") ? liveRow() : null }), {
      action: "select",
    });
    const res = await call({ action: "verify", token: "tok-abc" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, email: EMAIL });
    // tokens are 256-bit: no attempt counting
    expect(db.queriesFor(TABLE, "update")).toHaveLength(0);
    const [select] = db.queriesFor(TABLE, "select");
    expect(select.maybeSingle).toBe(true);
    expect(select.hasFilter("is", "consumed_at", null)).toBe(true);
  });

  it("rejects an unknown, used or expired token with invalid_link", async () => {
    db.on(TABLE, { data: null }, { action: "select" });
    const res = await call({ action: "verify", token: "nope" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "invalid_link" });
  });

  it("prefers the token over an email/code pair", async () => {
    db.on(TABLE, { data: liveRow() }, { action: "select" });
    const res = await call({ action: "verify", token: "tok", email: EMAIL, code: "999999" });
    expect(res.body).toEqual({ ok: true, email: EMAIL });
  });

  it("ignores a non-string token and falls back to the code path", async () => {
    const res = await call({ action: "verify", token: { $ne: null } });
    expect(res.body).toEqual({ error: "invalid_code" });
  });
});

describe("action: complete", () => {
  function setupComplete({ claimed = true, updateError = null, linkError = null } = {}) {
    db.on(
      TABLE,
      { data: claimed ? [{ id: "row-1" }] : [] },
      { action: "update", match: (q) => q.payload && "consumed_at" in q.payload }
    );
    db.auth.admin.updateUserById.mockResolvedValue(
      updateError ? { data: null, error: updateError } : { data: { user: { id: "user-1", email: EMAIL } }, error: null }
    );
    db.auth.admin.generateLink.mockResolvedValue(
      linkError ? { data: null, error: linkError } : { data: { properties: { hashed_token: "hashed-xyz" } }, error: null }
    );
  }

  it.each([["short"], ["x".repeat(73)], [""], [undefined], [12345678]])(
    "rejects weak/invalid password %j before touching the database",
    async (password) => {
      const res = await call({ action: "complete", email: EMAIL, code: "123456", password });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: "weak_password" });
      expect(db.queries).toHaveLength(0);
    }
  );

  it("accepts exactly 8 and exactly 72 characters", async () => {
    for (const password of ["x".repeat(8), "x".repeat(72)]) {
      db = createFakeSupabase();
      getSupabaseAdmin.mockReturnValue(db);
      setupCodeRow(liveRow());
      setupComplete();
      const res = await call({ action: "complete", email: EMAIL, code: "123456", password });
      expect(res.body).toEqual({ ok: true, token_hash: "hashed-xyz" });
    }
  });

  it("sets the password with a code and returns a sign-in token hash", async () => {
    setupCodeRow(liveRow());
    setupComplete();
    const res = await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, token_hash: "hashed-xyz" });
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith("user-1", { password: "new-password-1" });
    expect(db.auth.admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: EMAIL });
  });

  it("consumes the row BEFORE changing the password", async () => {
    setupCodeRow(liveRow());
    const order = [];
    db.on(
      TABLE,
      (q) => {
        order.push("consume");
        expect(q.hasFilter("is", "consumed_at", null)).toBe(true);
        expect(q.returning).toBe(true);
        return { data: [{ id: "row-1" }] };
      },
      { action: "update", match: (q) => q.payload && "consumed_at" in q.payload }
    );
    db.auth.admin.updateUserById.mockImplementation(async () => {
      order.push("updateUser");
      return { data: { user: { email: EMAIL } }, error: null };
    });
    db.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "h" } }, error: null });
    await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(order).toEqual(["consume", "updateUser"]);
  });

  it("does not change the password if another request already consumed the code", async () => {
    setupCodeRow(liveRow());
    setupComplete({ claimed: false });
    const res = await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "invalid_code" });
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it("reports invalid_link when a raced link was already consumed", async () => {
    db.on(TABLE, { data: liveRow() }, { action: "select" });
    setupComplete({ claimed: false });
    const res = await call({ action: "complete", token: "tok", password: "new-password-1" });
    expect(res.body).toEqual({ error: "invalid_link" });
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it("works with a link token", async () => {
    db.on(TABLE, { data: liveRow({ user_id: "user-9" }) }, { action: "select" });
    setupComplete();
    const res = await call({ action: "complete", token: "tok", password: "new-password-1" });
    expect(res.body).toEqual({ ok: true, token_hash: "hashed-xyz" });
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith("user-9", { password: "new-password-1" });
  });

  it("refuses a wrong code without changing anything", async () => {
    setupCodeRow(liveRow());
    setupComplete();
    const res = await call({ action: "complete", email: EMAIL, code: "111111", password: "new-password-1" });
    expect(res.body).toEqual({ error: "invalid_code" });
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it("returns password_rejected with Supabase's message when the policy says no", async () => {
    setupCodeRow(liveRow());
    setupComplete({ updateError: { message: "Password should contain a number" } });
    const res = await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "password_rejected", message: "Password should contain a number" });
    expect(db.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  // The row is consumed before updateUserById; when Supabase rejects the
  // password it is released again, so the retry the form invites works.
  it("leaves the code usable after a password_rejected so the member can retry", async () => {
    setupCodeRow(liveRow());
    setupComplete({ updateError: { message: "Password is too weak" } });
    await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password" });
    const released = db
      .queriesFor(TABLE, "update")
      .some((q) => q.payload && "consumed_at" in q.payload && q.payload.consumed_at === null);
    expect(released).toBe(true);
  });

  it("still reports success with token_hash null when generateLink fails (password did change)", async () => {
    setupCodeRow(liveRow());
    setupComplete({ linkError: { message: "rate limited" } });
    const res = await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, token_hash: null });
    expect(db.auth.admin.updateUserById).toHaveBeenCalled();
  });

  it("counts the complete call as one more check of the code", async () => {
    setupCodeRow(liveRow({ attempts: 1 }));
    setupComplete();
    await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(db.queriesFor(TABLE, "update").find((q) => "attempts" in q.payload).payload).toEqual({ attempts: 2 });
  });

  // A right code gives its check back, so a member whose last allowed check
  // is a successful verify can still complete afterwards.
  it("a right code gives its check back", async () => {
    setupCodeRow(liveRow({ attempts: 7 }));
    setupComplete();
    const res = await call({ action: "complete", email: EMAIL, code: "123456", password: "new-password-1" });
    expect(res.body).toEqual({ ok: true, token_hash: "hashed-xyz" });
    const attemptWrites = db.queriesFor(TABLE, "update").filter((q) => q.payload && "attempts" in q.payload);
    expect(attemptWrites.map((q) => q.payload.attempts)).toEqual([8, 7]);
  });
});

describe("request → verify round trip", () => {
  it("the code in the email verifies against the stored hash", async () => {
    setupRequest();
    await call({ action: "request", email: EMAIL });
    const code = sentEmail().subject.slice(0, 6);
    const stored = db.queriesFor(TABLE, "insert")[0].payload;

    db = createFakeSupabase();
    getSupabaseAdmin.mockReturnValue(db);
    setupCodeRow(liveRow({ code_hash: stored.code_hash }));
    const res = await call({ action: "verify", email: EMAIL, code });
    expect(res.body).toEqual({ ok: true, email: EMAIL });
  });

  it("the link in the email verifies against the stored hash", async () => {
    setupRequest();
    await call({ action: "request", email: EMAIL });
    const token = sentEmail().textContent.match(/token=([\w-]+)/)[1];
    const stored = db.queriesFor(TABLE, "insert")[0].payload;

    db = createFakeSupabase();
    getSupabaseAdmin.mockReturnValue(db);
    db.on(TABLE, (q) => ({ data: q.filterValue("eq", "link_hash") === stored.link_hash ? liveRow() : null }), {
      action: "select",
    });
    const res = await call({ action: "verify", token });
    expect(res.body).toEqual({ ok: true, email: EMAIL });
  });
});

describe("resetEmail()", () => {
  it("builds subject, text and branded HTML containing the code and link", () => {
    const { subject, text, html } = resetEmail("012345", "https://x.test/reset-password?token=abc", "https://x.test");
    expect(subject).toBe("012345 is your RTG password reset code");
    expect(text).toContain("Your code: 012345");
    expect(text).toContain("https://x.test/reset-password?token=abc");
    expect(text).toContain("expire in 30 minutes");
    expect(html).toContain("012345");
    expect(html).toContain('href="https://x.test/reset-password?token=abc"');
    expect(html).toContain("https://x.test/images/email/rtg-logo-white.png");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
});
