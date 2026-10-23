import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CodeTimerRoute from "../../../src/volunteer-timer/CodeTimerRoute";

const owner = { credentialId: "c1", scope: "advanced", version: 3, state: { schemaVersion: 1, riders: [], sessions: [] } };
const realLocation = window.location;
afterEach(() => { Object.defineProperty(window, "location", { value: realLocation, configurable: true }); });

it("ending an owner code session goes back to Admin -> Ridge — Access codes", async () => {
  const calls = [];
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push(body?.action || url);
    const data = String(url).includes("action=status") ? { enabled: true } : body?.action === "read" ? owner : { ok: true };
    return { ok: true, json: async () => data };
  });
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { ...realLocation, assign }, configurable: true });
  render(<CodeTimerRoute />);
  fireEvent.click(await screen.findByRole("button", { name: "End code session" }));
  await waitFor(() => expect(assign).toHaveBeenCalledWith("/admin/ridge-codes"));
  expect(calls).toContain("logout");
});
