import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const state = vi.hoisted(() => ({ session: { access_token: "tok" }, user: { id: "u1" } }));
vi.mock("../../src/lib/supabaseClient", () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock("../../src/lib/useSession", () => ({ default: () => state }));

import useStravaRefresh from "../../src/lib/useStravaRefresh";
import { STRAVA_SYNCED_EVENT, useStravaSyncedTick } from "../../src/lib/stravaEvents";

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(fetch).mockReset();
});

describe("useStravaRefresh()", () => {
  it("asks the server for the member's new rides, and announces when some arrived", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ fetched: 2 }) });
    const heard = vi.fn();
    window.addEventListener(STRAVA_SYNCED_EVENT, heard);
    renderHook(() => useStravaRefresh());
    await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/auth/account?op=strava-refresh", expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer tok" } }));
    window.removeEventListener(STRAVA_SYNCED_EVENT, heard);
  });

  it("stays quiet when nothing new came in", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ skipped: "recent" }) });
    const heard = vi.fn();
    window.addEventListener(STRAVA_SYNCED_EVENT, heard);
    renderHook(() => useStravaRefresh());
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener(STRAVA_SYNCED_EVENT, heard);
  });

  it("doesn't ask again within 10 minutes in the same tab", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ fetched: 0 }) });
    renderHook(() => useStravaRefresh());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    renderHook(() => useStravaRefresh());
    await new Promise((r) => setTimeout(r, 0));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("useStravaSyncedTick()", () => {
  it("goes up each time new rides are announced, so data hooks re-read", () => {
    const { result } = renderHook(() => useStravaSyncedTick());
    expect(result.current).toBe(0);
    act(() => window.dispatchEvent(new Event(STRAVA_SYNCED_EVENT)));
    expect(result.current).toBe(1);
  });
});
