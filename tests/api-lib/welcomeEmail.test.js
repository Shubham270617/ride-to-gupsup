import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "../helpers/fakeSupabase.js";
import { jsonResponse, mockReq, mockRes } from "../helpers/http.js";

vi.mock("../../api-lib/supabaseAdmin.js", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSupabaseAdmin } from "../../api-lib/supabaseAdmin.js";
import welcomeEmail, { welcomeContent } from "../../api-lib/welcomeEmail.js";

const DAY = 24 * 60 * 60 * 1000;
let db;
let fetchMock;

const newUser = (overrides = {}) => ({
  id: "user-1",
  email: "Asha@Example.com",
  created_at: new Date(Date.now() - DAY).toISOString(),
  user_metadata: {},
  ...overrides,
});

function call({ method = "POST", token = "good-token" } = {}) {
  const req = mockReq({ method, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const res = mockRes();
  return welcomeEmail(req, res).then(() => res);
}

// The conditional "claim" update on profiles.
function onClaim(result) {
  db.on("profiles", result, {
    action: "update",
    times: 1,
    match: (q) => q.payload?.welcome_email_sent_at !== null,
  });
}

beforeEach(() => {
  vi.stubEnv("BREVO_API_KEY", "brevo-key");
  vi.stubEnv("MAIL_FROM_EMAIL", "no-reply@rideteagupshup.com");
  vi.stubEnv("FRONTEND_URL", "https://rideteagupshup.com");
  db = createFakeSupabase();
  getSupabaseAdmin.mockReturnValue(db);
  fetchMock = vi.fn(async () => jsonResponse({ messageId: "m1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("welcomeEmail handler — guards", () => {
  it("rejects non-POST with 405", async () => {
    const res = await call({ method: "GET" });
    expect(res.statusCode).toBe(405);
  });

  it("requires a bearer token", async () => {
    const res = await call({ token: null });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "missing_token" });
  });

  it("returns server_misconfigured without Supabase", async () => {
    getSupabaseAdmin.mockReturnValue(null);
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "server_misconfigured" });
  });

  it("returns server_misconfigured without the mailer env", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    const res = await call();
    expect(res.body).toEqual({ error: "server_misconfigured" });
  });

  it("rejects an invalid session with 401", async () => {
    db.signIn(newUser(), "other-token");
    const res = await call({ token: "good-token" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_session" });
  });

  it("accepts a lowercase 'bearer' prefix", async () => {
    db.signIn(newUser());
    onClaim({ data: [{ full_name: "Asha" }] });
    const req = mockReq({ headers: { authorization: "bearer good-token" } });
    const res = mockRes();
    await welcomeEmail(req, res);
    expect(res.body).toEqual({ sent: true });
  });
});

describe("welcomeEmail handler — who gets one", () => {
  it("skips synthetic @members. addresses (no mailbox)", async () => {
    db.signIn(newUser({ email: "strava_1@members.rideteagupshup.com" }));
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ sent: false, reason: "no_mailbox" });
    expect(db.queries).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips accounts without an email", async () => {
    db.signIn(newUser({ email: null }));
    const res = await call();
    expect(res.body).toEqual({ sent: false, reason: "no_mailbox" });
  });

  it("skips accounts more than 7 days old", async () => {
    db.signIn(newUser({ created_at: new Date(Date.now() - 8 * DAY).toISOString() }));
    const res = await call();
    expect(res.body).toEqual({ sent: false, reason: "not_new" });
    expect(db.queries).toHaveLength(0);
  });

  it("still welcomes an account just under 7 days old", async () => {
    db.signIn(newUser({ created_at: new Date(Date.now() - 7 * DAY + 60_000).toISOString() }));
    onClaim({ data: [{ full_name: "Asha" }] });
    const res = await call();
    expect(res.body).toEqual({ sent: true });
  });

  it("does not send twice: already_sent when the claim matches no row", async () => {
    db.signIn(newUser());
    onClaim({ data: [] });
    const res = await call();
    expect(res.body).toEqual({ sent: false, reason: "already_sent" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("claims with a conditional update (only where welcome_email_sent_at is null)", async () => {
    db.signIn(newUser());
    onClaim({ data: [{ full_name: "Asha Rao" }] });
    await call();
    const [claim] = db.queriesFor("profiles", "update");
    expect(claim.hasFilter("eq", "id", "user-1")).toBe(true);
    expect(claim.hasFilter("is", "welcome_email_sent_at", null)).toBe(true);
    expect(claim.payload.welcome_email_sent_at).toEqual(expect.any(String));
    expect(claim.returning).toBe(true);
  });

  it("returns 500 when the claim query fails", async () => {
    db.signIn(newUser());
    onClaim({ error: { message: "boom" } });
    const res = await call();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "unexpected_error" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("welcomeEmail handler — sending", () => {
  it("sends to the lowercased address, greeting by first name from the profile", async () => {
    db.signIn(newUser());
    onClaim({ data: [{ full_name: "  Asha   Rao " }] });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ sent: true });
    const mail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(mail.to).toEqual([{ email: "asha@example.com" }]);
    expect(mail.subject).toBe("Welcome to the movement, Asha! 🚴");
    expect(mail.htmlContent).toContain("https://rideteagupshup.com/dashboard");
  });

  it.each([
    [{ full_name: null }, { full_name: "Meta Name" }, "Meta"],
    [{ full_name: null }, { name: "Google Person" }, "Google"],
    [{ full_name: null }, {}, "asha"],
  ])("falls back for the name: profile %j, metadata %j -> %s", async (profile, metadata, expected) => {
    db.signIn(newUser({ user_metadata: metadata }));
    onClaim({ data: [profile] });
    await call();
    const mail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(mail.subject).toBe(`Welcome to the movement, ${expected}! 🚴`);
  });

  it("releases the claim and returns 502 when Brevo fails, so a later sign-in retries", async () => {
    db.signIn(newUser());
    onClaim({ data: [{ full_name: "Asha" }] });
    fetchMock.mockResolvedValue(jsonResponse("nope", { status: 500 }));
    const res = await call();
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "send_failed" });
    const release = db.queriesFor("profiles", "update").find((q) => q.payload.welcome_email_sent_at === null);
    expect(release).toBeDefined();
    expect(release.hasFilter("eq", "id", "user-1")).toBe(true);
  });

  it("uses the request host for links when FRONTEND_URL is not set", async () => {
    vi.stubEnv("FRONTEND_URL", "");
    db.signIn(newUser());
    onClaim({ data: [{ full_name: "Asha" }] });
    await call();
    const mail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(mail.htmlContent).toContain("https://rtg.test/dashboard");
  });
});

describe("welcomeContent()", () => {
  it("escapes HTML in the member's name inside the HTML body", () => {
    const { html } = welcomeContent('<img src=x onerror="alert(1)">', "https://s.test");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&LT;IMG SRC=X ONERROR=&QUOT;ALERT(1)&QUOT;&GT;");
  });

  it("escapes the name in the preheader too", () => {
    const { html } = welcomeContent("<b>Bold</b>", "https://s.test");
    expect(html).not.toContain("<b>Bold</b>");
    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
  });

  it("keeps the plain-text version and subject unescaped", () => {
    const { subject, text } = welcomeContent("Tom & Jerry", "https://s.test");
    expect(subject).toBe("Welcome to the movement, Tom & Jerry! 🚴");
    expect(text.startsWith("You're in, Tom & Jerry!")).toBe(true);
  });

  it("links every call to action to the given site", () => {
    const { html, text } = welcomeContent("Asha", "https://s.test");
    for (const path of ["/dashboard", "/weekly-rides", "/events", "/challenges", "/lab", "/community"]) {
      expect(html).toContain(`https://s.test${path}`);
    }
    expect(text).toContain("https://s.test/events");
    expect(html).toContain("YOU'RE IN, <span style=\"color:#f76b1c\">ASHA!</span>");
  });
});
