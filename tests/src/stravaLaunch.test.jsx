import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { STRAVA_ENABLED, visibleLabProgrammes, launchLabCopy, publicAuthProviders } from "../../src/lib/launchFeatures";
import StravaLaunchGate from "../../src/components/StravaLaunchGate";
import { useMyStravaActivities, useMyLeaderboardStats } from "../../src/lib/publicData";
import useAuthProviders from "../../src/lib/useAuthProviders";

const from = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/supabaseClient", () => ({ isSupabaseConfigured: true, supabase: { from } }));

beforeEach(() => { from.mockReset(); });

describe("Strava launch pause", () => {
  it("is disabled by default and preserves other auth providers", () => {
    expect(STRAVA_ENABLED).toBe(false);
    expect(publicAuthProviders({ strava: true, xfitconnect: true })).toEqual({ strava: false, xfitconnect: true });
  });

  it("filters the Strava slug and alternate card links without hiding Ridge or community links", () => {
    const ridge = { slug: "ridge-repeats", link: "/lab/ridge" };
    const community = { slug: "community", link: "https://www.strava.com/clubs/rtg" };
    expect(visibleLabProgrammes([
      { slug: "strava-challenge" },
      { slug: "renamed", link: "/lab/strava?view=board" },
      { slug: "other", secondaryLink: "https://example.com/lab/strava#board" },
      ridge, community,
    ])).toEqual([ridge, community]);
  });

  it("replaces saved full-launch promises without mutating the stored copy", () => {
    const copy = { labsTitle: "Two labs.", aboutBody: "Strava totals", heroText: "Strava activity", heroTitle: "RTG" };
    const launch = launchLabCopy(copy);
    expect(launch.labsTitle).not.toMatch(/two labs/i);
    expect(launch.aboutBody + launch.heroText).not.toMatch(/strava/i);
    expect(launch.aboutBody).toContain("Ridge Repeats");
    expect(launch.heroTitle).toBe("RTG");
    expect(copy.aboutBody).toBe("Strava totals");
  });

  it.each(["/lab/strava", "/lab/strava?view=board", "/lab/strava/"])("redirects %s without mounting the board", async (path) => {
    const board = vi.fn(() => <div>Strava board</div>);
    const Board = board;
    function Location() { return <div>{useLocation().pathname}</div>; }
    render(<MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/lab/strava" element={<StravaLaunchGate><Board /></StravaLaunchGate>} />
      <Route path="/lab" element={<Location />} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText("/lab")).toBeInTheDocument();
    expect(board).not.toHaveBeenCalled();
  });

  it("does not query activities or leaderboard totals for signed-in members or session changes", () => {
    const { result, rerender } = renderHook(({ id }) => ({
      activities: useMyStravaActivities(id), stats: useMyLeaderboardStats(id),
    }), { initialProps: { id: "member-one" } });
    expect(result.current).toEqual({ activities: [], stats: null });
    rerender({ id: "member-two" });
    rerender({ id: undefined });
    expect(from).not.toHaveBeenCalled();
  });

  it("hides Strava even when the configured provider endpoint advertises it", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ strava: true, xfitconnect: true }) });
    const { result } = renderHook(() => useAuthProviders());
    await waitFor(() => expect(result.current.xfitconnect).toBe(true));
    expect(result.current.strava).toBe(false);
  });
});
