import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const state = vi.hoisted(() => ({ user: null, requestLogin: null }));
vi.mock("../../../src/lib/supabaseClient.js", () => ({
  supabase: { auth: { signOut: async () => ({}) } },
  isSupabaseConfigured: true,
}));
vi.mock("../../../src/lib/useSession.js", () => ({
  default: () => ({ session: state.user ? { user: state.user } : null, user: state.user, loading: false }),
}));
vi.mock("../../../src/lib/useMyAvatar.js", () => ({ default: () => null }));
vi.mock("../../../src/lib/publicData.js", () => ({ useSiteImages: () => ({}) }));
vi.mock("../../../src/lib/AuthGateContext.jsx", () => ({ useAuthGate: () => ({ requestLogin: state.requestLogin }) }));
vi.mock("../../../src/lib/CartContext.jsx", () => ({ useCart: () => ({ count: 0, setOpen: () => {} }) }));

import Navbar from "../../../src/components/Navbar.jsx";

const renderNav = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

const adminLinks = (container) => [...container.querySelectorAll('a[href="/admin/login"]')];

beforeEach(() => {
  state.user = null;
  state.requestLogin = vi.fn();
});

describe("Navbar", () => {
  it("signed out: shows Login and Signup that open the auth gate", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getAllByRole("button", { name: "Login" })[0]);
    expect(state.requestLogin).toHaveBeenCalledWith("login");
    await user.click(screen.getAllByRole("button", { name: "Signup" })[0]);
    expect(state.requestLogin).toHaveBeenCalledWith("signup");
  });

  it("signed out: has a hidden /admin/login link that is invisible to assistive tech and keyboard", () => {
    const { container } = renderNav();
    const links = adminLinks(container);
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("aria-hidden", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
      expect(link.textContent.trim()).toBe("");
    }
    // not exposed as a link to screen readers
    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
  });

  it("signed in: no admin link and no Login button", () => {
    state.user = { id: "u1", email: "m@example.com", user_metadata: { full_name: "Member" } };
    const { container } = renderNav();
    expect(adminLinks(container)).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Signup" })).toBeNull();
  });
});
