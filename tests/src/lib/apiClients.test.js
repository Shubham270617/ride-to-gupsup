import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../helpers/http.js";

const supabase = vi.hoisted(() => ({
  auth: { verifyOtp: null, setSession: null, getSession: null },
}));
vi.mock("../../../src/lib/supabaseClient.js", () => ({ supabase, isSupabaseConfigured: true }));

import {
  checkResetCredential,
  completePasswordReset,
  requestPasswordReset,
} from "../../../src/lib/passwordReset.js";
import { signInWithPhone } from "../../../src/lib/phoneAuth.js";
import { claimBootstrapAdmin } from "../../../src/lib/adminBootstrap.js";
import { getAiSessionId, sendAiMessage } from "../../../src/lib/aiChat.js";

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  supabase.auth.verifyOtp = vi.fn(async () => ({ error: null }));
  supabase.auth.setSession = vi.fn(async () => ({ error: null }));
  supabase.auth.getSession = vi.fn(async () => ({ data: { session: { access_token: "tok" } } }));
});

const bodyOf = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe("src/lib/passwordReset.js", () => {
  it("request posts the action to /api/auth/account?op=password-reset", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const result = await requestPasswordReset("a@b.co");
    expect(result).toEqual({ data: { ok: true } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/account?op=password-reset");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(bodyOf()).toEqual({ action: "request", email: "a@b.co" });
  });

  it.each([
    ["invalid_email", "Enter a valid email address."],
    ["too_many_requests", "Too many reset requests. Please try again in an hour."],
    ["invalid_code", "That code isn't right. Check the email and try again."],
    ["too_many_attempts", "Too many wrong tries. Request a new code."],
    ["invalid_link", "This link has expired or was already used. Request a new one."],
    ["weak_password", "Use between 8 and 72 characters."],
    ["send_failed", "We couldn't send the email. Please try again in a few minutes."],
  ])("maps server error %s to friendly text", async (code, message) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: code }, { status: 400 }));
    const { error } = await requestPasswordReset("a@b.co");
    expect(error).toEqual({ code, message, retryAfter: undefined });
  });

  it("passes retryAfter through for too_soon", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "too_soon", retryAfter: 31 }, { status: 429 }));
    const { error } = await requestPasswordReset("a@b.co");
    expect(error.retryAfter).toBe(31);
    expect(error.message).toMatch(/wait a moment/);
  });

  it("prefers a server-supplied message (password_rejected)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "password_rejected", message: "Password should contain a digit" }, { status: 400 })
    );
    const { error } = await completePasswordReset({ token: "t" }, "password1");
    expect(error.message).toBe("Password should contain a digit");
  });

  it("falls back to a generic message for unknown errors, bad JSON and network failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "weird" }, { status: 500 }));
    expect((await requestPasswordReset("a@b.co")).error.message).toBe("Something went wrong. Please try again.");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError("html")) });
    expect((await requestPasswordReset("a@b.co")).error.message).toBe("Something went wrong. Please try again.");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect(await requestPasswordReset("a@b.co")).toEqual({
      error: { message: "Something went wrong. Please try again." },
    });
  });

  it("verify sends the credential as-is", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, email: "a@b.co" }));
    await checkResetCredential({ email: "a@b.co", code: "123456" });
    expect(bodyOf()).toEqual({ action: "verify", email: "a@b.co", code: "123456" });
    await checkResetCredential({ token: "tok" });
    expect(bodyOf(1)).toEqual({ action: "verify", token: "tok" });
  });

  it("complete sets the password and then signs in with the returned token hash", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, token_hash: "hash-1" }));
    const result = await completePasswordReset({ email: "a@b.co", code: "123456" }, "new-password");
    expect(result).toEqual({});
    expect(bodyOf()).toEqual({ action: "complete", email: "a@b.co", code: "123456", password: "new-password" });
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-1", type: "email" });
  });

  it("complete without a token hash tells the member to log in with the new password", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, token_hash: null }));
    const result = await completePasswordReset({ token: "t" }, "new-password");
    expect(result.error.message).toMatch(/password was changed/);
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("complete reports a failed session swap the same way", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, token_hash: "h" }));
    supabase.auth.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const result = await completePasswordReset({ token: "t" }, "new-password");
    expect(result.error.message).toMatch(/Log in with your new password/);
  });
});

describe("src/lib/phoneAuth.js", () => {
  it("adopts the session returned by op=phone-login", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: "at", refresh_token: "rt" }));
    const result = await signInWithPhone("+91 99999", "pw");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/account?op=phone-login");
    expect(bodyOf()).toEqual({ phone: "+91 99999", password: "pw" });
    expect(supabase.auth.setSession).toHaveBeenCalledWith({ access_token: "at", refresh_token: "rt" });
    expect(result).toEqual({ error: null });
  });

  it("maps invalid_credentials and never calls setSession on failure", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "invalid_credentials" }, { status: 401 }));
    const result = await signInWithPhone("1", "x");
    expect(result.error.message).toBe("Incorrect phone number or password.");
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it("survives a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    expect((await signInWithPhone("1", "x")).error.message).toMatch(/Something went wrong/);
  });
});

describe("src/lib/adminBootstrap.js", () => {
  it("returns no_session without calling the server when signed out", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await claimBootstrapAdmin()).toEqual({ granted: false, reason: "no_session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the server's own refusal through verbatim", async () => {
    const refusal = { granted: false, reason: "not_authorised", message: "Not authorised" };
    fetchMock.mockResolvedValue(jsonResponse(refusal, { status: 403 }));
    expect(await claimBootstrapAdmin()).toEqual(refusal);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("reports request_failed when the route is missing or the network fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.reject(new Error("html")) });
    expect(await claimBootstrapAdmin()).toEqual({ granted: false, reason: "request_failed" });
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect(await claimBootstrapAdmin()).toEqual({ granted: false, reason: "request_failed" });
  });
});

describe("src/lib/aiChat.js", () => {
  it("creates one session id per browser and reuses it", () => {
    const first = getAiSessionId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(getAiSessionId()).toBe(first);
    expect(localStorage.getItem("rtg_ai_session_id")).toBe(first);
  });

  it("sends the message with an optional bearer token and returns the reply", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reply: "Chai time!" }));
    const reply = await sendAiMessage({ sessionId: "s", message: "hi", history: [], token: "t" });
    expect(reply).toBe("Chai time!");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ai/chat");
    expect(init.headers.Authorization).toBe("Bearer t");
    await sendAiMessage({ sessionId: "s", message: "hi", history: [] });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("throws the server's error text", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "rate_limited" }, { status: 429 }));
    await expect(sendAiMessage({ sessionId: "s", message: "hi", history: [] })).rejects.toThrow("rate_limited");
  });
});
