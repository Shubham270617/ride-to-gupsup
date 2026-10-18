import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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

import { checkResetCredential, completePasswordReset, requestPasswordReset } from "../../../src/lib/passwordReset.js";
import ForgotPassword from "../../../src/pages/ForgotPassword.jsx";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const heading = (name) => screen.findByRole("heading", { level: 1, name });

async function submitEmail(user, email = "  Rider@Example.com ") {
  await user.type(screen.getByPlaceholderText("Email address"), email);
  await user.click(screen.getByRole("button", { name: /Send code/ }));
}

beforeEach(() => {
  cfg.configured = true;
  vi.clearAllMocks();
  requestPasswordReset.mockResolvedValue({ data: { ok: true } });
  checkResetCredential.mockResolvedValue({ data: { ok: true, email: "rider@example.com" } });
  completePasswordReset.mockResolvedValue({});
});

describe("ForgotPassword page", () => {
  it("walks email → code → new password → signed in → dashboard", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await heading("Reset your password")).toBeInTheDocument();

    await submitEmail(user);
    expect(requestPasswordReset).toHaveBeenCalledWith("rider@example.com");
    expect(await heading("Enter your code")).toBeInTheDocument();
    expect(screen.getByText("rider@example.com")).toBeInTheDocument();

    // focus starts in the first box; the sixth digit verifies on its own
    expect(screen.getByLabelText("Digit 1")).toHaveFocus();
    await user.keyboard("12345");
    expect(checkResetCredential).not.toHaveBeenCalled();
    await user.keyboard("6");
    expect(checkResetCredential).toHaveBeenCalledTimes(1);
    expect(checkResetCredential).toHaveBeenCalledWith({ email: "rider@example.com", code: "123456" });

    expect(await heading("Set a new password")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("New password"), "brand-new-pass");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "brand-new-pass");
    await user.click(screen.getByRole("button", { name: "Update password & sign in" }));
    expect(completePasswordReset).toHaveBeenCalledWith({ email: "rider@example.com", code: "123456" }, "brand-new-pass");

    expect(await heading("You're back in")).toBeInTheDocument();
    expect(await screen.findByText("Dashboard page", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("pasting the code also verifies it straight away", async () => {
    const user = userEvent.setup();
    renderPage();
    await submitEmail(user);
    await heading("Enter your code");
    await user.paste("654321");
    expect(checkResetCredential).toHaveBeenCalledWith({ email: "rider@example.com", code: "654321" });
    expect(await heading("Set a new password")).toBeInTheDocument();
  });

  it("stays on the code step and shows the error for a wrong code", async () => {
    const user = userEvent.setup();
    checkResetCredential.mockResolvedValue({ error: { code: "invalid_code", message: "That code isn't right." } });
    renderPage();
    await submitEmail(user);
    await heading("Enter your code");
    await user.paste("111111");
    expect(await screen.findByText("That code isn't right.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Enter your code" })).toBeInTheDocument();
  });

  it("the Verify button is disabled until six digits are entered", async () => {
    const user = userEvent.setup();
    renderPage();
    await submitEmail(user);
    await heading("Enter your code");
    expect(screen.getByRole("button", { name: "Verify code" })).toBeDisabled();
  });

  it("refuses a Strava/Google synthetic address without calling the server", async () => {
    const user = userEvent.setup();
    renderPage();
    await submitEmail(user, "strava_1@members.rideteagupshup.com");
    expect(screen.getByText(/signs in with Strava or Google/)).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("says login isn't connected when Supabase isn't configured", async () => {
    cfg.configured = false;
    const user = userEvent.setup();
    renderPage();
    await submitEmail(user);
    expect(screen.getByText(/Login isn't connected yet/)).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows a request error and stays on the email step", async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue({
      error: { code: "too_soon", message: "Please wait a moment before asking for another code.", retryAfter: 30 },
    });
    renderPage();
    await submitEmail(user);
    expect(await screen.findByText("Please wait a moment before asking for another code.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeInTheDocument();
  });

  it("says so when no account uses the email, and never shows the code step", async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue({
      error: { code: "no_account", message: "No RTG account uses this email. Check it for typos, or sign up instead." },
    });
    renderPage();
    await submitEmail(user);
    expect(await screen.findByText(/No RTG account uses this email/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Enter your code" })).not.toBeInTheDocument();
  });

  it("counts down before allowing a resend, then resends", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderPage();
      await submitEmail(user);
      await heading("Enter your code");
      const resend = screen.getByRole("button", { name: /Resend in 45s/ });
      expect(resend).toBeDisabled();
      for (let i = 0; i < 45; i++) {
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
      }
      const ready = screen.getByRole("button", { name: "Resend code" });
      expect(ready).toBeEnabled();
      await user.click(ready);
      expect(requestPasswordReset).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("'Use a different email' goes back to the first step", async () => {
    const user = userEvent.setup();
    renderPage();
    await submitEmail(user);
    await heading("Enter your code");
    await user.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(await heading("Reset your password")).toBeInTheDocument();
  });

  it("shows a failed password update on the password step", async () => {
    const user = userEvent.setup();
    completePasswordReset.mockResolvedValue({ error: { message: "Password should contain a number" } });
    renderPage();
    await submitEmail(user);
    await heading("Enter your code");
    await user.paste("123456");
    await heading("Set a new password");
    await user.type(screen.getByPlaceholderText("New password"), "brand-new-pass");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "brand-new-pass");
    await user.click(screen.getByRole("button", { name: "Update password & sign in" }));
    expect(await screen.findByText("Password should contain a number")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "You're back in" })).toBeNull();
  });

  it("the close button returns to the site", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Back to the site" }));
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });
});
