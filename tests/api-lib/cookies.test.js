import { describe, expect, it, vi } from "vitest";
import { parseCookies, serializeCookie } from "../../api-lib/cookies.js";

describe("parseCookies()", () => {
  it("parses a Cookie header into an object", () => {
    expect(parseCookies("a=1; b=two;c=3")).toEqual({ a: "1", b: "two", c: "3" });
  });

  it("returns {} for missing or empty headers", () => {
    expect(parseCookies()).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("URL-decodes values and keeps '=' inside values", () => {
    expect(parseCookies("ticket=u1.123.sig%3D%3D; x=a=b")).toEqual({ ticket: "u1.123.sig==", x: "a=b" });
  });

  it("skips fragments without '=' and empty names", () => {
    expect(parseCookies("flag; =orphan; ok=1")).toEqual({ ok: "1" });
  });

  it("trims whitespace around names and values", () => {
    expect(parseCookies("  name  =  value  ")).toEqual({ name: "value" });
  });
});

describe("serializeCookie()", () => {
  it("is HttpOnly, SameSite=Lax and site-wide", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(serializeCookie("oauth_state", "abc")).toBe("oauth_state=abc; Path=/; HttpOnly; SameSite=Lax");
  });

  it("URL-encodes the value", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(serializeCookie("v", "a b;c")).toMatch(/^v=a%20b%3Bc;/);
  });

  it("adds Max-Age when given", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(serializeCookie("s", "x", { maxAge: 600 })).toContain("; Max-Age=600");
  });

  it("adds Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(serializeCookie("s", "x")).toMatch(/; Secure$/);
  });

  // Regression for a bug found while testing: `if (maxAge)` dropped
  // maxAge: 0, so callback.js's "clear the cookie" calls produced an empty
  // session cookie instead of deleting it.
  it("emits Max-Age=0 so a cookie can actually be deleted", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(serializeCookie("oauth_connect", "", { maxAge: 0 })).toBe(
      "oauth_connect=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
  });

  it("round-trips through parseCookies", () => {
    const header = serializeCookie("t", "u1.999.sig=+/").split(";")[0];
    expect(parseCookies(header)).toEqual({ t: "u1.999.sig=+/" });
  });
});
