import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QuickSession from "../../../src/volunteer-timer/QuickSession";
import { applyRidgeCommand, istDate } from "../../../src/lib/ridge/engine";

// A stand-in for /api/admin/ridge that runs the real Ridge engine in memory.
function fakeRidge(state) {
  let version = 0;
  const request = vi.fn(async (body) => {
    if (!body) return { state: structuredClone(state), version };
    if (body.version !== version) throw new Error("stale");
    state = applyRidgeCommand(state, body.command).state;
    version += 1;
    return { ok: true, version };
  });
  return { request, get state() { return state; } };
}
const today = istDate(Date.now());
const empty = () => ({ schemaVersion: 1, riders: [{ id: "r1", name: "Rohit" }], sessions: [] });

it("creates a Live session for today and hands it back", async () => {
  const ridge = fakeRidge(empty());
  const onReady = vi.fn();
  render(<QuickSession riderCount={1} request={ridge.request} onReady={onReady} />);
  fireEvent.click(screen.getByRole("button", { name: "Create session" }));
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  const s = ridge.state.sessions[0];
  expect(s).toMatchObject({ date: today, mode: "live", finished: false });
  expect(onReady).toHaveBeenCalledWith(s.id);
});

it("a finished session on that date is archived (kept) only after asking, then a fresh one is made", async () => {
  const start = empty();
  start.sessions.push({ id: "old", date: today, mode: "testing", finished: true, entries: [], awardOverrides: [] });
  const ridge = fakeRidge(start);
  const onReady = vi.fn();
  render(<QuickSession riderCount={1} request={ridge.request} onReady={onReady} />);
  fireEvent.click(screen.getByRole("button", { name: "Create session" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/already has a Testing session that is finished/);
  expect(onReady).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Archive old & create new" }));
  await waitFor(() => expect(onReady).toHaveBeenCalled());
  expect(ridge.state.sessions.find((s) => s.id === "old").mode).toBe("archived");
  const fresh = ridge.state.sessions.find((s) => s.id !== "old");
  expect(fresh).toMatchObject({ date: today, mode: "live", finished: false });
});

it("an open session on that date is simply selected", async () => {
  const start = empty();
  start.sessions.push({ id: "open", date: today, mode: "live", finished: false, entries: [], awardOverrides: [] });
  const ridge = fakeRidge(start);
  const onReady = vi.fn();
  render(<QuickSession riderCount={1} request={ridge.request} onReady={onReady} />);
  fireEvent.click(screen.getByRole("button", { name: "Create session" }));
  await waitFor(() => expect(onReady).toHaveBeenCalledWith("open"));
  expect(ridge.state.sessions).toHaveLength(1);
});

it("warns when there are no riders yet", () => {
  render(<QuickSession riderCount={0} request={vi.fn()} onReady={vi.fn()} />);
  expect(screen.getByText(/no riders yet/i)).toBeInTheDocument();
});
