import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewPasswordForm, { MIN_PASSWORD_LENGTH } from "../../../src/components/NewPasswordForm.jsx";

async function fill(user, password, confirm = password) {
  await user.type(screen.getByPlaceholderText("New password"), password);
  await user.type(screen.getByPlaceholderText("Confirm new password"), confirm);
}

describe("NewPasswordForm", () => {
  it("has two new-password fields capped at bcrypt's 72 characters", () => {
    render(<NewPasswordForm onSubmit={vi.fn()} />);
    for (const field of [screen.getByPlaceholderText("New password"), screen.getByPlaceholderText("Confirm new password")]) {
      expect(field).toHaveAttribute("type", "password");
      expect(field).toHaveAttribute("autocomplete", "new-password");
      expect(field).toHaveAttribute("maxlength", "72");
      expect(field).toHaveAttribute("minlength", String(MIN_PASSWORD_LENGTH));
    }
    expect(screen.getByRole("button", { name: "Update password" })).toBeEnabled();
  });

  it("uses a custom submit label", () => {
    render(<NewPasswordForm onSubmit={vi.fn()} submitLabel="Save & sign in" />);
    expect(screen.getByRole("button", { name: "Save & sign in" })).toBeInTheDocument();
  });

  it("refuses a password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<NewPasswordForm onSubmit={onSubmit} />);
    // bypass the browser's own minlength check to reach the component's
    container.querySelector("form").noValidate = true;
    await fill(user, "short");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses mismatched passwords", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewPasswordForm onSubmit={onSubmit} />);
    await fill(user, "longenough1", "longenough2");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByText("Those two passwords don't match.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the password and shows a spinner while waiting", async () => {
    const user = userEvent.setup();
    let resolve;
    const onSubmit = vi.fn(() => new Promise((r) => (resolve = r)));
    render(<NewPasswordForm onSubmit={onSubmit} />);
    await fill(user, "correct horse");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(onSubmit).toHaveBeenCalledWith("correct horse");
    expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
    resolve(undefined);
    await waitFor(() => expect(screen.getByRole("button", { name: "Update password" })).toBeEnabled());
    expect(screen.queryByText(/match|at least 8 characters\./)).toBeNull();
  });

  it("shows the error message onSubmit resolves to", async () => {
    const user = userEvent.setup();
    render(<NewPasswordForm onSubmit={async () => "That code isn't right."} />);
    await fill(user, "correct horse");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByText("That code isn't right.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update password" })).toBeEnabled();
  });

  it("clears a previous error on the next submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<NewPasswordForm onSubmit={onSubmit} />);
    await fill(user, "longenough1", "nope-nope-");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByText("Those two passwords don't match.")).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Confirm new password"));
    await user.type(screen.getByPlaceholderText("Confirm new password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.queryByText("Those two passwords don't match.")).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith("longenough1");
  });

  it("the eye button toggles both fields between hidden and shown", async () => {
    const user = userEvent.setup();
    render(<NewPasswordForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByPlaceholderText("New password")).toHaveAttribute("type", "text");
    expect(screen.getByPlaceholderText("Confirm new password")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByPlaceholderText("New password")).toHaveAttribute("type", "password");
  });
});
