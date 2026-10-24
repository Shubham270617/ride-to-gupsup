import { it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import Demo from "../../../src/volunteer-timer/VolunteerTimerDemo";

const card = (name) => screen.getByRole("heading", { name }).closest("article");

it("break, confirm before finishing a rider, resume — completed laps kept", () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Example rider A" }));
  fireEvent.click(screen.getByRole("button", { name: "Save attendance" }));
  fireEvent.click(screen.getByRole("button", { name: "2 · Timer" }));
  fireEvent.click(screen.getByRole("button", { name: "Start all · Lap 1" }));
  fireEvent.click(within(card("Example rider A")).getByRole("button", { name: "FINISH · L1" }));

  // Lap 1 done, not passed: the rider is on a break and can start lap 2 later.
  expect(within(card("Example rider A")).getByText(/On a break/)).toBeInTheDocument();
  expect(within(card("Example rider A")).getByRole("button", { name: "START · L2" })).toBeInTheDocument();

  // Finishing asks first; Cancel changes nothing.
  fireEvent.click(within(card("Example rider A")).getByRole("button", { name: /Rider done/ }));
  expect(screen.getByRole("alert")).toHaveTextContent(/Mark Example rider A as finished/);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(within(card("Example rider A")).getByRole("button", { name: "START · L2" })).toBeInTheDocument();

  fireEvent.click(within(card("Example rider A")).getByRole("button", { name: /Rider done/ }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, finished" }));
  expect(within(card("Example rider A")).getByText("Finished · 1 lap")).toBeInTheDocument();
  expect(within(card("Example rider A")).queryByRole("button", { name: "START · L2" })).toBeNull();

  fireEvent.click(within(card("Example rider A")).getByRole("button", { name: "Resume rider" }));
  expect(within(card("Example rider A")).getByRole("button", { name: "START · L2" })).toBeInTheDocument();

  // Lap times shows the per-rider totals.
  fireEvent.click(screen.getByRole("button", { name: "4 · Lap times" }));
  const sheet = screen.getByRole("region", { name: "Example rider A lap times" });
  for (const total of ["Riding", "Breaks", "Elapsed"]) expect(within(sheet).getByText(total)).toBeInTheDocument();
});

it("several sessions can be created on the same day, each named", () => {
  render(<Demo />);
  const date = screen.getByLabelText("New session date").value;
  fireEvent.change(screen.getByLabelText("New session name"), { target: { value: "Evening" } });
  fireEvent.click(screen.getByRole("button", { name: "Create session" }));
  const options = within(screen.getByRole("combobox", { name: "Session" })).getAllByRole("option").map((o) => o.textContent);
  expect(options.some((t) => t.includes("Evening"))).toBe(true);
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
