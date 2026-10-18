import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authStorage, isRemembered, setRemembered } from "../../../src/lib/authStorage.js";

const KEY = "sb-proj-auth-token";
const realLocal = Object.getOwnPropertyDescriptor(window, "localStorage");
const realSession = Object.getOwnPropertyDescriptor(window, "sessionStorage");

function breakStorage(name, mode = "access") {
  if (mode === "access") {
    Object.defineProperty(window, name, {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    return;
  }
  // exists, but every write throws (Safari private mode style)
  const real = window[name];
  const broken = {
    getItem: (k) => real.getItem(k),
    setItem() {
      throw new DOMException("quota", "QuotaExceededError");
    },
    removeItem: (k) => real.removeItem(k),
    key: (i) => real.key(i),
    get length() {
      return real.length;
    },
  };
  Object.defineProperty(window, name, { configurable: true, get: () => broken });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "localStorage", realLocal);
  Object.defineProperty(window, "sessionStorage", realSession);
});

describe("isRemembered()", () => {
  it("defaults to true", () => {
    expect(isRemembered()).toBe(true);
  });

  it("is false only after an explicit opt-out", () => {
    localStorage.setItem("rtg_remember_me", "0");
    expect(isRemembered()).toBe(false);
    localStorage.setItem("rtg_remember_me", "1");
    expect(isRemembered()).toBe(true);
  });

  it("defaults to true when localStorage throws", () => {
    breakStorage("localStorage");
    expect(isRemembered()).toBe(true);
  });
});

describe("authStorage adapter", () => {
  it("remember on: writes to localStorage and clears any sessionStorage copy", () => {
    sessionStorage.setItem(KEY, "stale");
    authStorage.setItem(KEY, "fresh");
    expect(localStorage.getItem(KEY)).toBe("fresh");
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(authStorage.getItem(KEY)).toBe("fresh");
  });

  it("remember off: writes to sessionStorage and clears any localStorage copy", () => {
    localStorage.setItem("rtg_remember_me", "0");
    localStorage.setItem(KEY, "stale");
    authStorage.setItem(KEY, "fresh");
    expect(sessionStorage.getItem(KEY)).toBe("fresh");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(authStorage.getItem(KEY)).toBe("fresh");
  });

  it("reads from the other store when the preferred one has nothing (no sign-out on upgrade)", () => {
    sessionStorage.setItem(KEY, "legacy-session");
    expect(authStorage.getItem(KEY)).toBe("legacy-session");
  });

  it("prefers the configured store when both have a value", () => {
    localStorage.setItem(KEY, "local");
    sessionStorage.setItem(KEY, "session");
    expect(authStorage.getItem(KEY)).toBe("local");
    localStorage.setItem("rtg_remember_me", "0");
    expect(authStorage.getItem(KEY)).toBe("session");
  });

  it("returns null when neither store has the key", () => {
    expect(authStorage.getItem(KEY)).toBeNull();
  });

  it("removeItem clears both stores", () => {
    localStorage.setItem(KEY, "a");
    sessionStorage.setItem(KEY, "b");
    authStorage.removeItem(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("never throws when both stores are inaccessible", () => {
    breakStorage("localStorage");
    breakStorage("sessionStorage");
    expect(() => authStorage.setItem(KEY, "v")).not.toThrow();
    expect(authStorage.getItem(KEY)).toBeNull();
    expect(() => authStorage.removeItem(KEY)).not.toThrow();
  });

  it("falls back to sessionStorage reads when localStorage is blocked", () => {
    sessionStorage.setItem(KEY, "s");
    breakStorage("localStorage");
    expect(authStorage.getItem(KEY)).toBe("s");
  });

  it("treats a store whose writes throw as unavailable", () => {
    breakStorage("localStorage", "write");
    expect(() => authStorage.setItem(KEY, "v")).not.toThrow();
    // localStorage was rejected by the probe, so nothing was written there
    expect(realLocal.get.call(window).getItem(KEY)).toBeNull();
  });
});

describe("setRemembered()", () => {
  it("records the preference", () => {
    setRemembered(false);
    expect(localStorage.getItem("rtg_remember_me")).toBe("0");
    expect(isRemembered()).toBe(false);
    setRemembered(true);
    expect(localStorage.getItem("rtg_remember_me")).toBe("1");
  });

  it("turning it off moves Supabase (sb-*) keys from localStorage to sessionStorage", () => {
    localStorage.setItem(KEY, "token");
    localStorage.setItem("sb-other", "x");
    localStorage.setItem("unrelated", "keep");
    setRemembered(false);
    expect(sessionStorage.getItem(KEY)).toBe("token");
    expect(sessionStorage.getItem("sb-other")).toBe("x");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem("sb-other")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(sessionStorage.getItem("unrelated")).toBeNull();
  });

  it("turning it on moves the session back to localStorage", () => {
    localStorage.setItem("rtg_remember_me", "0");
    sessionStorage.setItem(KEY, "token");
    setRemembered(true);
    expect(localStorage.getItem(KEY)).toBe("token");
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(authStorage.getItem(KEY)).toBe("token");
  });

  it("does not move the preference key itself", () => {
    setRemembered(false);
    expect(sessionStorage.getItem("rtg_remember_me")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    breakStorage("localStorage");
    expect(() => setRemembered(false)).not.toThrow();
    expect(() => setRemembered(true)).not.toThrow();
  });
});
