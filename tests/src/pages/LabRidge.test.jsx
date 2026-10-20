import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LabRidge from "../../../src/pages/LabRidge";
import { buildPublicFeed } from "../../../src/lib/ridge/engine.js";
import history from "../../fixtures/ridge/synthetic.json";
const mocks = vi.hoisted(() => ({
  session: { user: null, loading: false },
  registration: { registered: false, loading: false, register: vi.fn() },
  login: vi.fn(),
  feed: vi.fn(),
}));
vi.mock("../../../src/lib/useSession", () => ({
  default: () => mocks.session,
}));
vi.mock("../../../src/lib/AuthGateContext", () => ({
  useAuthGate: () => ({ requestLogin: mocks.login }),
}));
vi.mock("../../../src/lib/JoinCommunityContext", () => ({
  useJoinCommunity: () => vi.fn(),
}));
vi.mock("../../../src/lib/publicData", () => ({
  useSiteSettings: () => ({}),
  useSiteImages: () => ({}),
}));
vi.mock("../../../src/lib/labData", async (importOriginal) => ({
  ...(await importOriginal()),
  useLabAccessSteps: () => [],
  useLabRegistration: () => mocks.registration,
  useRidgeFeed: (enabled) => mocks.feed(enabled),
}));
vi.mock("../../../src/components/lab/LabBackdrop", () => ({
  default: () => null,
}));
vi.mock("../../../src/components/lab/MembershipPlans", () => ({
  default: () => null,
}));
const mount = () =>
  render(
    <MemoryRouter>
      <LabRidge />
    </MemoryRouter>,
  );
beforeEach(() => {
  mocks.session = { user: null, loading: false };
  mocks.registration = { registered: false, loading: false, register: vi.fn() };
  mocks.feed.mockImplementation((enabled) => ({
    ...(enabled
      ? buildPublicFeed(history.state)
      : { sessions: [], results: [], awards: [], spotlights: [] }),
    loading: false,
    error: "",
    checkedAt: new Date(),
    reload: vi.fn(),
  }));
});
describe("native Ridge page", () => {
  it("does not request member results for guests or pending access checks", () => {
    mount();
    expect(mocks.feed).toHaveBeenLastCalledWith(false);
    expect(document.querySelector("iframe")).toBeNull();
  });
  it("holds data back while membership is loading", () => {
    mocks.session = { user: { id: "member" }, loading: true };
    mocks.registration.registered = true;
    mount();
    expect(mocks.feed).toHaveBeenLastCalledWith(false);
  });
  it("renders the real native leaderboard and opens rider details without Google", () => {
    mocks.session = { user: { id: "member" }, loading: false };
    mocks.registration.registered = true;
    mount();
    expect(mocks.feed).toHaveBeenLastCalledWith(true);
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getAllByText("Asha").length).toBeGreaterThan(0);
    const rider = screen
      .getAllByRole("button")
      .find(
        (b) =>
          b.classList.contains("rr-award-rider") &&
          b.textContent.includes("Asha"),
      );
    fireEvent.click(rider);
    expect(screen.getByRole("dialog")).toHaveTextContent("Asha");
    expect(document.querySelector('[href*="script.google.com"]')).toBeNull();
  });
});
