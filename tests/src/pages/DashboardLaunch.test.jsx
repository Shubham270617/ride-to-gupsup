import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createFakeSupabase } from "../../helpers/fakeSupabase";
import Dashboard from "../../../src/pages/Dashboard";

const state = vi.hoisted(() => ({ db: null, user: { id: "member", email: "rider@example.com" } }));
vi.mock("../../../src/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  get supabase() { return state.db; },
}));
vi.mock("../../../src/lib/useSession", () => ({ default: () => ({ user: state.user, loading: false }) }));
vi.mock("../../../src/lib/AuthGateContext", () => ({ useAuthGate: () => ({ openAuth: vi.fn() }) }));

// Strava stays live on RTG (Randeep's Strava pause was left out on purpose).
describe("member dashboard keeps Strava", () => {
  it("shows the connect-Strava card to a member without Strava", async () => {
    state.db = createFakeSupabase();
    state.db.on("profiles", { data: { id: "member", full_name: "Test Rider", strava_athlete_id: null } });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ strava: true }) });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByAltText("Connect with Strava")).toBeInTheDocument();
  });

  it("shows 'Strava connected' and reads Strava stats for a linked member", async () => {
    state.db = createFakeSupabase();
    state.db.on("profiles", { data: { id: "member", full_name: "Test Rider", strava_athlete_id: 12345 } });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ strava: true }) });
    render(<MemoryRouter initialEntries={["/dashboard?strava=connected"]}><Dashboard /></MemoryRouter>);
    expect((await screen.findAllByText("Strava connected")).length).toBeGreaterThan(0);
    expect(state.db.queries.some((q) => q.table === "leaderboard_stats")).toBe(true);
  });
});
