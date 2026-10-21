import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { jsonResponse } from "../../helpers/http.js";

const state = vi.hoisted(() => ({ session: null, settings: {} }));
vi.mock("../../../src/lib/supabaseClient.js", () => ({ supabase: {}, isSupabaseConfigured: true }));
vi.mock("../../../src/lib/useSession.js", () => ({
  default: () => ({ session: state.session, user: state.session?.user ?? null, loading: false }),
}));
vi.mock("../../../src/lib/publicData.js", () => ({ useSiteSettings: () => state.settings }));

import useWelcomeEmail from "../../../src/lib/useWelcomeEmail.js";
import {
  APPEARANCE_KEYS,
  applyAppearance,
  applyCachedAppearance,
  resolveAppearance,
  useAppearance,
} from "../../../src/lib/appearance.js";

const DAY = 86400000;
let fetchMock;

beforeEach(() => {
  state.session = null;
  state.settings = {};
  fetchMock = vi.fn(async () => jsonResponse({ sent: true }));
  vi.stubGlobal("fetch", fetchMock);
  document.documentElement.removeAttribute("style");
});

const signIn = (user) => {
  state.session = { access_token: "tok", user };
};

describe("useWelcomeEmail()", () => {
  it("does nothing when signed out", () => {
    renderHook(() => useWelcomeEmail());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the server once for a new account and remembers the answer", async () => {
    signIn({ id: "u1", created_at: new Date(Date.now() - DAY).toISOString() });
    renderHook(() => useWelcomeEmail());
    await waitFor(() => expect(localStorage.getItem("rtg_welcome_checked_u1")).toBe("1"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/account?op=welcome", {
      method: "POST",
      headers: { Authorization: "Bearer tok" },
    });
    renderHook(() => useWelcomeEmail());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips accounts older than a week without a request", () => {
    signIn({ id: "u2", created_at: new Date(Date.now() - 8 * DAY).toISOString() });
    renderHook(() => useWelcomeEmail());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("rtg_welcome_checked_u2")).toBe("1");
  });

  it("leaves a server error to retry on a later visit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "send_failed" }, { status: 502 }));
    signIn({ id: "u3", created_at: new Date().toISOString() });
    renderHook(() => useWelcomeEmail());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(localStorage.getItem("rtg_welcome_checked_u3")).toBeNull();
  });

  it("swallows network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    signIn({ id: "u4", created_at: new Date().toISOString() });
    renderHook(() => useWelcomeEmail());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(localStorage.getItem("rtg_welcome_checked_u4")).toBeNull();
  });
});

describe("appearance", () => {
  it("resolveAppearance falls back to defaults for unknown values", () => {
    const r = resolveAppearance({ [APPEARANCE_KEYS.size]: "999", [APPEARANCE_KEYS.font]: "comic-sans" }, "/");
    expect(r.size).toBe(16);
    expect(r.font.value).toBe("default");
    expect(resolveAppearance().size).toBe(16);
  });

  it("applyAppearance sets the design tokens on <html>", () => {
    applyAppearance({ [APPEARANCE_KEYS.size]: "20", [APPEARANCE_KEYS.color]: "contrast" }, document.documentElement, "/");
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--rtg-text-scale")).toBe("1.25");
    expect(style.getPropertyValue("--color-rtg-white")).toBe("#0b0712");
  });

  it("applyCachedAppearance replays the cache and ignores bad JSON", () => {
    localStorage.setItem("rtg_appearance", JSON.stringify({ [APPEARANCE_KEYS.size]: "12" }));
    applyCachedAppearance("/");
    expect(document.documentElement.style.getPropertyValue("--rtg-text-scale")).toBe("0.75");
    localStorage.setItem("rtg_appearance", "{not json");
    expect(() => applyCachedAppearance("/")).not.toThrow();
  });

  it("useAppearance waits for settings, then applies and caches them", () => {
    const { rerender } = renderHook(() => useAppearance(), { wrapper: ({ children }) => <MemoryRouter initialEntries={["/events"]}>{children}</MemoryRouter> });
    expect(localStorage.getItem("rtg_appearance")).toBeNull();
    state.settings = { [APPEARANCE_KEYS.font]: "system" };
    rerender();
    expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain("system-ui");
    expect(JSON.parse(localStorage.getItem("rtg_appearance"))).toEqual({
      [APPEARANCE_KEYS.size]: "16",
      [APPEARANCE_KEYS.font]: "system",
      [APPEARANCE_KEYS.color]: "default",
      [APPEARANCE_KEYS.pages]: "{}",
      [APPEARANCE_KEYS.sections]: "{}",
    });
  });

  it("useAppearance applies a page's own font and size and follows navigation", () => {
    state.settings = { [APPEARANCE_KEYS.size]: "16", [APPEARANCE_KEYS.pages]: JSON.stringify({ "/events": { size: 18, font: "georgia" } }) };
    const wrapper = (path) => ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
    const onEvents = renderHook(() => useAppearance(), { wrapper: wrapper("/events/night-ride") });
    expect(document.documentElement.style.getPropertyValue("--rtg-text-scale")).toBe("1.125");
    expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain("Georgia");
    onEvents.unmount();
    renderHook(() => useAppearance(), { wrapper: wrapper("/about") });
    expect(document.documentElement.style.getPropertyValue("--rtg-text-scale")).toBe("1");
    expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain("Montserrat");
  });
});
