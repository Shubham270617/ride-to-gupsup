import { beforeEach, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {ridgeRecovery} from "../../../src/lib/ridge/recovery";
import RidgeAdmin from "../../../src/admin/pages/RidgeAdmin";
import { applyRidgeCommand, istDate } from "../../../src/lib/ridge/engine.js";
vi.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token", user: {id:"fixture-owner",last_sign_in_at:"fixture-login"} } },
      }),
    },
  },
}));
vi.mock("../../../src/admin/components/ImageUploadField", () => ({
  default: () => null,
}));
let data, fail;
beforeEach(() => {
  const owner=JSON.stringify(["fixture-owner","fixture-login"]);if(ridgeRecovery.read(owner)){ridgeRecovery.reviewed(owner);ridgeRecovery.clear(owner);}
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

it("ignores a late older read after a newer refresh completes", async () => {
  let finishOld;
  const old = structuredClone(data);old.state.riders[0].name='Old response';
  fetch.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}));
  render(<MemoryRouter><RidgeAdmin /></MemoryRouter>);
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button',{name:'Retry loading Ridge'}));
  await screen.findByText('Rider roster & attendance');
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  finishOld({ok:true,json:async()=>old});
  await waitFor(()=>expect(screen.queryByText('Old response')).toBeNull());
  expect(screen.getByText('Asha')).toBeInTheDocument();
});

it("aborts an active read when leaving Ridge", async () => {
  fetch.mockImplementation(()=>new Promise(()=>{}));
  const view=render(<MemoryRouter><RidgeAdmin /></MemoryRouter>);
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
  const signal=fetch.mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);
});

it('restores an uncertain operation after navigation and remount without automatically posting',async()=>{
 const first=render(<MemoryRouter><RidgeAdmin /></MemoryRouter>);
 await screen.findByText('Rider roster & attendance');
 const original=fetch.getMockImplementation();let posted;
 fetch.mockImplementation(async(url,opts)=>{
  if(opts.method==='POST'){
   if(posted){expect(opts.body).toBe(posted);return {ok:true,json:async()=>({alreadySaved:true})};}
   posted=opts.body;await original(url,opts);throw new Error('Lost response after commit');
  }return original(url,opts);
 });
 fireEvent.change(screen.getByRole('textbox',{name:'New rider name'}),{target:{value:'Recovered rider'}});
 fireEvent.click(screen.getByRole('button',{name:'Add rider'}));
 await screen.findByRole('button',{name:'Retry unconfirmed action'});first.unmount();
 render(<MemoryRouter><RidgeAdmin /></MemoryRouter>);
 await screen.findByRole('button',{name:'Retry unconfirmed action'});
 expect(fetch.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(1);
 expect(screen.getByRole('button',{name:'I reviewed current records and audit; clear reminder'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Retry unconfirmed action'}));
 await screen.findByText('Saved. Website results and the audit log are up to date.');
 expect(data.state.riders.filter(r=>r.name==='Recovered rider')).toHaveLength(1);
});

