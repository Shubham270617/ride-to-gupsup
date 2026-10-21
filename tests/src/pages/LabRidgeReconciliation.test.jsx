import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LabRidge from "../../../src/pages/LabRidge";

const mocks = vi.hoisted(() => ({
  session: { user: null, loading: false },
  registration: { registered: false, loading: false, register: vi.fn() },
  login: vi.fn(),
  raw: { sessions: [], results: [], awards: [], spotlights: [], loading: false, error: "", checkedAt: new Date(), reload: vi.fn() },
}));
vi.mock("../../../src/lib/useSession", () => ({ default: () => mocks.session }));
vi.mock("../../../src/lib/AuthGateContext", () => ({ useAuthGate: () => ({ requestLogin: mocks.login }) }));
vi.mock("../../../src/lib/JoinCommunityContext", () => ({ useJoinCommunity: () => vi.fn() }));
vi.mock("../../../src/lib/publicData", () => ({ useSiteSettings: () => ({}), useSiteImages: () => ({}) }));
vi.mock("../../../src/lib/labData", async (original) => ({
  ...await original(),
  useLabAccessSteps: () => [],
  useLabRegistration: () => mocks.registration,
  useRidgeFeed: () => mocks.raw,
}));
vi.mock("../../../src/components/lab/MembershipPlans", () => ({ default: ({ only }) => <div data-testid="membership-plans">{only}</div> }));
vi.mock("../../../src/components/lab/RidgeCardMaker", () => ({ default: () => null }));
const mount = () => render(<MemoryRouter><LabRidge /></MemoryRouter>);

beforeEach(() => {
  mocks.session = { user: null, loading: false };
  mocks.registration = { registered: false, loading: false, register: vi.fn().mockResolvedValue(true) };
  mocks.raw = { sessions: [], results: [], awards: [], spotlights: [], loading: false, error: "", checkedAt: new Date(), reload: vi.fn() };
  mocks.login.mockClear();
});

const signIn = () => {
  mocks.session.user = { id: "member" };
  mocks.registration.registered = true;
};

describe("native Ridge launch", () => {
  it("uses RTG login for guests and never embeds a Google dashboard", () => {
    const { container } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Log in to RTG" }));
    expect(mocks.login).toHaveBeenCalledWith("login");
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector(".rtg-ridge")).toHaveAttribute("inert");
  });

  it("locks the board while checking access even when registration was cached", () => {
    signIn();
    mocks.session.loading = true;
    const { container } = mount();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your Ridge Repeats access");
    expect(container.querySelector(".rtg-ridge")).toHaveAttribute("inert");
  });

  it("does not trust stale registration after logout", () => {
    mocks.registration.registered = true;
    const { container } = mount();
    expect(screen.getByRole("button", { name: "Log in to RTG" })).toBeInTheDocument();
    expect(container.querySelector(".rtg-ridge")).toHaveAttribute("inert");
  });

  it("reports registration failure without unlocking the board", async () => {
    mocks.session.user = { id: "member" };
    mocks.registration.register.mockRejectedValue(new Error("offline"));
    const { container } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Register for this challenge" }));
    await waitFor(() => expect(screen.getByText("We couldn’t register you just now. Please try again.")).toBeInTheDocument());
    expect(container.querySelector(".rtg-ridge")).toHaveAttribute("inert");
  });

  it("shows native manual results and handles legacy sessions without dates", () => {
    signIn();
    mocks.raw.sessions = [{ slug: "legacy", name: "Legacy", session_date: null }];
    mocks.raw.results = [{ id: "result-1", athlete_name: "Test Rider", session_slug: "legacy", loop_times: "20:00,19:00" }];
    const { container } = mount();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector(".rtg-ridge")).not.toHaveAttribute("inert");
    expect(screen.getAllByText("Test Rider").length).toBeGreaterThan(0);
    expect(screen.getByText("Undated")).toBeInTheDocument();
    expect(screen.getByTestId("membership-plans")).toHaveTextContent("ridge");
  });

  it("shows unavailable rather than a successful connection on a read error and supports refresh", () => {
    signIn();
    mocks.raw.error = "Ridge table unavailable";
    mount();
    expect(screen.getByRole("status")).toHaveTextContent("Results unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("Ridge table unavailable");
    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(mocks.raw.reload).toHaveBeenCalledOnce();
  });
});

 it("labels copied sample results honestly", () => {
    signIn();
    mocks.raw.sessions = [{ slug: "s", name: "Sample Session A", session_date: "2026-09-29" }];
    mocks.raw.results = [{ id: "sample", athlete_name: "Fixture", session_slug: "s", loop_times: "20:00,19:00" }];
    mount();
    expect(screen.getByTestId("ridge-score-source")).toHaveTextContent("Sample results for testing");
  });

 it("renders authoritative points and opens same-name riders by stable identity", () => {
    signIn();
    mocks.raw.sessions = [{ slug: "official", name: "Official", session_date: "2026-10-03" }];
    mocks.raw.results = [3, 7].map((improvement, i) => ({ id: `o-${i}`, athlete_id: `stable-${i}`, athlete_name: "Same Name", session_slug: "official", score_source: "official-published", lap_points: [null, improvement, null, 0, null], improvement, completed_laps: 2, highlight_score: 0, total_score: improvement + 2, loop_times: "20:00,,19:00" }));
    const { container } = mount();
    expect(screen.getByTestId("ridge-score-source")).toHaveTextContent("Official published scores");
    const buttons = container.querySelectorAll(".rr-rider-row");
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(document.querySelector(".rr-detail-score strong")).toHaveTextContent("+7.00");
    expect(document.querySelectorAll(".rr-lap-table tbody tr")[3]).toHaveTextContent("0.00");
    expect(screen.getAllByText("Not supplied").length).toBeGreaterThan(0);
    expect(document.querySelector(".rr-save-card")).toBeDisabled();
  });
