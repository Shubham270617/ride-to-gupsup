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

describe("member dashboard during the Strava pause", () => {
  it.each([null, 12345])("hides Strava for athlete id %s, preserving profile and membership reads", async (athleteId) => {
    state.db = createFakeSupabase();
    state.db.on("profiles", { data: { id: "member", full_name: "Test Rider", strava_athlete_id: athleteId } });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ strava: true }) });
    const { container } = render(<MemoryRouter initialEntries={["/dashboard?strava=connected"]}><Dashboard /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Strava|synced activities/i);
    expect(state.db.queries.some((q) => q.table === "profiles")).toBe(true);
    expect(state.db.queries.some((q) => q.table === "membership_purchases")).toBe(true);
    expect(state.db.queries.some((q) => ["strava_activities", "leaderboard_stats"].includes(q.table))).toBe(false);
  });
});
