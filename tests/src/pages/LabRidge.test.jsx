import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LabRidge from "../../../src/pages/LabRidge";
import { RIDGE_DASHBOARD_URL } from "../../../src/components/lab/RidgeDashboard";

const mocks = vi.hoisted(() => ({
  session: { user: null, loading: false },
  registration: { registered: false, loading: false, register: vi.fn() },
  login: vi.fn(),
}));
vi.mock("../../../src/lib/useSession", () => ({ default: () => mocks.session }));
vi.mock("../../../src/lib/AuthGateContext", () => ({ useAuthGate: () => ({ requestLogin: mocks.login }) }));
vi.mock("../../../src/lib/publicData", () => ({ useSiteSettings: () => ({}) }));
vi.mock("../../../src/lib/labData", () => ({
  buildRidgeCopy: () => ({ title: "Ridge Repeats", backLabel: "RTG Club Lab", accessTitle: "Join Ridge Repeats" }),
  buildLabCopy: () => ({ backLabel: "Back to Lab", loginLabel: "Log in", registerLabel: "Register", registeringLabel: "Registering…", registerError: "Registration failed. Please retry." }),
  useLabAccessSteps: () => [],
  useLabRegistration: () => mocks.registration,
}));
vi.mock("../../../src/components/lab/MembershipPlans", () => ({ default: ({ only }) => <div data-testid="membership-plans">{only}</div> }));

const frameTitle = "Ridge Repeats leaderboard, rider records and Session Spotlight";
const mount = () => render(<MemoryRouter><LabRidge /></MemoryRouter>);

beforeEach(() => {
  mocks.session = { user: null, loading: false };
  mocks.registration = { registered: false, loading: false, register: vi.fn().mockResolvedValue(undefined) };
  mocks.login.mockClear();
});

describe("Ridge Google dashboard integration", () => {
  it("keeps the dashboard unloaded for guests and opens the existing login flow", () => {
    mount();
    expect(screen.queryByTitle(frameTitle)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(mocks.login).toHaveBeenCalledWith("login");
  });

  it("waits for access checks even when a registration is cached", () => {
    mocks.session = { user: { id: "member" }, loading: true };
    mocks.registration.registered = true;
    mount();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your Ridge Repeats access");
    expect(screen.queryByTitle(frameTitle)).not.toBeInTheDocument();
  });

  it("requires a signed-in user even if a stale registration is still present", () => {
    mocks.registration.registered = true;
    mount();
    expect(screen.queryByTitle(frameTitle)).not.toBeInTheDocument();
  });

  it("preserves registration and displays registration errors", async () => {
    mocks.session.user = { id: "member" };
    mocks.registration.register.mockRejectedValue(new Error("offline"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await waitFor(() => expect(screen.getByText("Registration failed. Please retry.")).toBeInTheDocument());
    expect(mocks.registration.register).toHaveBeenCalledOnce();
    expect(screen.queryByTitle(frameTitle)).not.toBeInTheDocument();
  });

  it("loads the supplied official dashboard and retains Ridge membership plans", () => {
    mocks.session.user = { id: "member" };
    mocks.registration.registered = true;
    mount();
    const frame = screen.getByTitle(frameTitle);
    expect(frame).toHaveAttribute("src", RIDGE_DASHBOARD_URL);
    expect(frame).toHaveAttribute("allow", "web-share; fullscreen");
    expect(screen.getByRole("link", { name: /Open full page/ })).toHaveAttribute("href", RIDGE_DASHBOARD_URL);
    expect(screen.getByTestId("membership-plans")).toHaveTextContent("ridge");
  });

  it("remounts the dashboard on reload without claiming its data is connected", () => {
    mocks.session.user = { id: "member" };
    mocks.registration.registered = true;
    mount();
    const before = screen.getByTitle(frameTitle);
    fireEvent.load(before);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload dashboard" }));
    expect(screen.getByTitle(frameTitle)).not.toBe(before);
    expect(screen.getByRole("status")).toHaveTextContent("Opening Ridge dashboard");
  });
});
