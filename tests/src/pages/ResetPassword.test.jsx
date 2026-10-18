import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const cfg = vi.hoisted(() => ({ configured: true }));
vi.mock("../../../src/lib/supabaseClient.js", () => ({
  supabase: null,
  get isSupabaseConfigured() {
    return cfg.configured;
  },
}));
vi.mock("../../../src/lib/passwordReset.js", () => ({
  requestPasswordReset: vi.fn(),
  checkResetCredential: vi.fn(),
  completePasswordReset: vi.fn(),
}));

import { checkResetCredential, completePasswordReset } from "../../../src/lib/passwordReset.js";
import ResetPassword from "../../../src/pages/ResetPassword.jsx";

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<p>Forgot password page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const heading = (name) => screen.findByRole("heading", { level: 1, name });

beforeEach(() => {
  cfg.configured = true;
  vi.clearAllMocks();
  checkResetCredential.mockResolvedValue({ data: { ok: true, email: "rider@example.com" } });
  completePasswordReset.mockResolvedValue({});
});

describe("ResetPassword page", () => {
  it("without a token, says the link no longer works and never calls the server", async () => {
    renderAt("/reset-password");
    expect(await heading("This link no longer works")).toBeInTheDocument();
    expect(checkResetCredential).not.toHaveBeenCalled();
  });

  it("offers a fresh code from the invalid screen", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password");
    await heading("This link no longer works");
    await user.click(screen.getByRole("link", { name: /Send me a new code/ }));
    expect(await screen.findByText("Forgot password page")).toBeInTheDocument();
  });

  it("is invalid when Supabase isn't configured, even with a token", async () => {
    cfg.configured = false;
    renderAt("/reset-password?token=abc");
    expect(await heading("This link no longer works")).toBeInTheDocument();
    expect(checkResetCredential).not.toHaveBeenCalled();
  });

  it("checks the token first, showing a checking state", async () => {
    let resolve;
    checkResetCredential.mockReturnValue(new Promise((r) => (resolve = r)));
    renderAt("/reset-password?token=abc");
    expect(await heading("Checking your link")).toBeInTheDocument();
    expect(checkResetCredential).toHaveBeenCalledWith({ token: "abc" });
    resolve({ data: { ok: true, email: "rider@example.com" } });
    expect(await heading("Set a new password")).toBeInTheDocument();
  });

  it("shows the invalid screen for an expired or used token", async () => {
    checkResetCredential.mockResolvedValue({ error: { code: "invalid_link", message: "expired" } });
    renderAt("/reset-password?token=old");
    expect(await heading("This link no longer works")).toBeInTheDocument();
  });

  it("a valid token shows the form for that email and signs in on submit", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=tok-123");
    expect(await heading("Set a new password")).toBeInTheDocument();
    expect(screen.getByText("rider@example.com")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("New password"), "brand-new-pass");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "brand-new-pass");
    await user.click(screen.getByRole("button", { name: "Update password & sign in" }));
    expect(completePasswordReset).toHaveBeenCalledWith({ token: "tok-123" }, "brand-new-pass");
    expect(await heading("You're back in")).toBeInTheDocument();
    expect(await screen.findByText("Dashboard page", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("works without an email in the verify response", async () => {
    checkResetCredential.mockResolvedValue({ data: { ok: true } });
    renderAt("/reset-password?token=t");
    await heading("Set a new password");
    expect(screen.getByText("Pick something you haven't used here before.")).toBeInTheDocument();
  });

  it("shows the server's error on the form when completing fails", async () => {
    const user = userEvent.setup();
    completePasswordReset.mockResolvedValue({
      error: { message: "This link has expired or was already used. Request a new one." },
    });
    renderAt("/reset-password?token=t");
    await heading("Set a new password");
    await user.type(screen.getByPlaceholderText("New password"), "brand-new-pass");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "brand-new-pass");
    await user.click(screen.getByRole("button", { name: "Update password & sign in" }));
    expect(await screen.findByText(/This link has expired/)).toBeInTheDocument();
  });
});
