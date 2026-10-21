import { beforeEach, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RidgeAdmin from "../../../src/admin/pages/RidgeAdmin";
import { applyRidgeCommand, istDate } from "../../../src/lib/ridge/engine.js";
vi.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));
vi.mock("../../../src/admin/components/ImageUploadField", () => ({
  default: () => null,
}));
let data, fail;
beforeEach(() => {
  fail = false;
  data = {
    version: 0,
    audit: [],
    state: {
      schemaVersion: 1,
      riders: [{ id: "a", name: "Asha", photo: "" }],
      sessions: [
        {
          id: "s",
          date: istDate(Date.now()),
          mode: "testing",
          finished: false,
          entries: [{ riderId: "a", laps: [], adjustment: 0 }],
          awardOverrides: [],
        },
      ],
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, opts) => {
      if (opts.method === "POST") {
        if (fail)
          return {
            ok: false,
            json: async () => ({
              error: "Save unavailable. Refresh to check.",
            }),
          };
        const body = JSON.parse(opts.body);
        expect(body.version).toBe(data.version);
        data = {
          ...data,
          state: applyRidgeCommand(data.state, body.command).state,
          version: data.version + 1,
        };
      }
      return { ok: true, json: async () => structuredClone(data) };
    }),
  );
});
const mount = async () => {
  render(
    <MemoryRouter>
      <RidgeAdmin />
    </MemoryRouter>,
  );
  await screen.findByText("Rider roster & attendance");
};
it("runs attendance and the native timer through the authenticated API", async () => {
  await mount();
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
  fireEvent.click(screen.getByRole("button", { name: "Timer" }));
  fireEvent.click(screen.getByRole("button", { name: "Start all · Lap 1" }));
  await screen.findByRole("button", { name: "Finish L1" });
  expect(data.state.sessions[0].entries[0].laps[0].start).toBeGreaterThan(0);
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer test-token",
  );
});
it("shows save failures without displaying a false success or losing the entered name", async () => {
  await mount();
  fail = true;
  const input = screen.getByRole("textbox", { name: "New rider name" });
  fireEvent.change(input, { target: { value: "Bala" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rider" }));
  await screen.findByRole("alert");
  expect(input).toHaveValue("Bala");
  expect(screen.getByRole("status")).toHaveTextContent("last action is not confirmed");
  expect(screen.queryByText(/^Saved\./)).toBeNull();
  expect(data.state.riders).toHaveLength(1);
});
it("publishes through the session controls and records an explicit reason", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: "Sessions" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), {
    target: { value: "Results checked" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply session change" }));
  await waitFor(() => expect(data.state.sessions[0].mode).toBe("live"));
  const post = fetch.mock.calls.find((c) => c[1].method === "POST");
  expect(JSON.parse(post[1].body).command).toMatchObject({
    type: "session_mode",
    mode: "live",
    reason: "Results checked",
  });
});


it("retries an uncertain response with the same request ID and exact command", async () => {
  await mount();
  const original = fetch.getMockImplementation();
  let committedBody = null;
  fetch.mockImplementation(async (url, opts) => {
    if (opts.method === "POST") {
      if (committedBody) {
        expect(opts.body).toBe(committedBody);
        return { ok: true, json: async () => ({ ok: true, alreadySaved: true }) };
      }
      committedBody = opts.body;
      await original(url, opts);
      throw new Error("Connection lost after commit");
    }
    return original(url, opts);
  });
  const input = screen.getByRole("textbox", { name: "New rider name" });
  fireEvent.change(input, { target: { value: "Bala" } });
  const add = screen.getByRole("button", { name: "Add rider" });
  fireEvent.click(add); fireEvent.click(add);
  await screen.findByRole("button", { name: "Retry unconfirmed action" });
  expect(fetch.mock.calls.filter(([,opts]) => opts.method === "POST")).toHaveLength(1);
  expect(data.state.riders).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Retry unconfirmed action" }));
  await screen.findByText("Saved. Website results and the audit log are up to date.");
  expect(data.state.riders).toHaveLength(2);
  expect(fetch.mock.calls.filter(([,opts]) => opts.method === "POST")).toHaveLength(2);
});
