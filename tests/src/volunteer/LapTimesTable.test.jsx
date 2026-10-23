import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import VolunteerTimerPanel from "../../../src/volunteer-timer/VolunteerTimerPanel";

const t = Date.UTC(2026, 9, 23, 16, 54, 57);
const sessions = [{ id: "s", date: "2026-10-23", mode: "testing", finished: false, awardOverrides: [], entries: [
  { riderId: "a", laps: [{ start: t, end: t + 19027 }] },
  { riderId: "b", laps: [] },
] }];
const riders = [{ id: "a", name: "Shubham Sinha" }, { id: "b", name: "Rohit" }];
const owner = { addRider: vi.fn(), createSession: vi.fn(), finishSession: vi.fn(), correct: vi.fn(), refresh: vi.fn() };
const open = (props) => {
  render(<VolunteerTimerPanel connected sessions={sessions} riders={riders} previewActions={{ send: vi.fn() }} now={t + 60000} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "4 · Lap times" }));
  return screen.getByRole("table");
};
const rowsFor = (table, rider) => within(table).getAllByRole("rowheader", { name: rider });

it("lists only the laps that were timed (one row for a rider with none yet)", () => {
  const table = open({ ownerActions: owner });
  expect(rowsFor(table, "Shubham Sinha")).toHaveLength(1);
  expect(rowsFor(table, "Rohit")).toHaveLength(1);
  expect(within(table).getAllByRole("cell", { name: "0:19.027" })).toHaveLength(2); // recorded and accepted
});

it("lets the owner add a missed lap, but not a volunteer", () => {
  open({ ownerActions: owner });
  expect(screen.getByRole("button", { name: "+ Add lap 2 time for Shubham Sinha" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Add lap .* for Rohit/ })).toBeNull();
});

it("volunteers see no add-lap buttons", () => {
  open({});
  expect(screen.queryByRole("button", { name: /\+ Add lap/ })).toBeNull();
});
