import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecretCode, { CodeInput } from "../../../src/volunteer-timer/SecretCode";

it("starts hidden, the eye shows and hides it, and Copy puts the real code on the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  render(<SecretCode code="ABCD-1234-WXYZ" />);
  expect(screen.queryByText("ABCD-1234-WXYZ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show code" }));
  expect(screen.getByText("ABCD-1234-WXYZ")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Hide code" }));
  expect(screen.queryByText("ABCD-1234-WXYZ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("ABCD-1234-WXYZ"));
  expect(await screen.findByText("Copied")).toBeInTheDocument();
});

it("the code box on the timer page can show what was typed", () => {
  render(<CodeInput value="secret" onChange={() => {}} />);
  const box = document.querySelector("input");
  expect(box.type).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Show code" }));
  expect(box.type).toBe("text");
});
