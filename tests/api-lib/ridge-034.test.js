import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createTimingCodeHandler } from "../../api-lib/timingCodes";
import { applyRidgeCommand, istDate } from "../../src/lib/ridge/engine.js";
import { mockReq, mockRes } from "../helpers/http";

// Migrations 034 + 035 end to end on an in-memory Postgres with every Ridge
// migration. The owner works through the admin path (engine + ridge_commit,
// as Admin -> Ridge does); volunteers through the real code API, so the
// database's own checks must agree with the app.
const owner = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const pepper = "synthetic-only-pepper-0000000000000000000";
const origin = "https://test.invalid";
const sql = (p) => readFileSync(new URL("../../supabase/migrations/" + p, import.meta.url), "utf8");
let db;
let cookie = null;

const adapter = {
  from(table) {
    let columns = "*", filters = [], values = [], one = false;
    const q = {
      select(c) { columns = c; return q; },
      eq(k, v) { values.push(v); filters.push(`${k}=$${values.length}`); return q; },
      single() { one = true; return q; },
      maybeSingle() { one = true; return q; },
      async then(resolve) {
        try {
          const r = await db.query(`select ${columns} from ${table}${filters.length ? " where " + filters.join(" and ") : ""}`, values);
          return resolve({ data: one ? r.rows[0] || null : r.rows });
        } catch (error) { return resolve({ error }); }
      },
    };
    return q;
  },
  async rpc(name, args) {
    try {
      const entries = Object.entries(args);
      const r = await db.query(`select ${name}(${entries.map(([k], i) => `${k}=>$${i + 1}`).join(",")}) as result`, entries.map(([, v]) => v));
      return { data: r.rows[0].result };
    } catch (error) { return { error }; }
  },
};
const handler = createTimingCodeHandler({ getDb: () => adapter, authorize: async () => ({ ok: true, user: { id: owner } }) });
const api = async (body) => {
  const res = mockRes();
  await handler(mockReq({ method: "POST", headers: { origin, ...(cookie ? { cookie } : {}) }, body }), res);
  return res;
};
// The owner's change, saved the way Admin -> Ridge saves it.
const admin = async (command) => {
  await db.exec("reset role");
  try {
    const w = (await db.query("select state, version from ridge_workspace")).rows[0];
    const r = applyRidgeCommand(w.state, command);
    await db.query("select ridge_commit($1,$2,$3,$4,$5,$6)", [w.version, crypto.randomUUID(), owner, r.state, r.feed, r.audit]);
  } finally {
    await db.exec("set role service_role");
  }
};
const volunteer = async (command) => {
  const read = await api({ action: "read" });
  return api({ action: "write", credentialId: read.body.credentialId, version: read.body.version, requestId: crypto.randomUUID(), command });
};
const state = async () => (await db.query("select state from ridge_workspace")).rows[0].state;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    insert into auth.users values('${owner}','shub88510@gmail.com',now());
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table profiles(id uuid primary key, strava_checked_at timestamptz);
    create table admin_profiles(id uuid primary key); insert into admin_profiles values('${owner}');
    create table lab_registrations(user_id uuid, programme_slug text);
    create function is_admin() returns boolean language sql as $$select false$$;
    grant usage on schema auth,public to service_role,authenticated,anon; grant select on admin_profiles,auth.users to service_role;`);
  for (const p of [
    "20261020211425_native_ridge_workspace.sql", "20261021152152_ridge_volunteer_timing_access.sql",
    "20261021170333_ridge_scoped_code_access_and_testing_dates.sql", "20261021174900_session_timing_codes.sql",
    "027_ridge_timing_account_removal.sql", "029_fixed_admin_emails.sql", "030_strava_checked_at.sql",
    "031_ridge_version_repair.sql", "033_owner_code_timing.sql", "034_ridge_rider_finish_and_members.sql",
    "035_remove_owner_codes.sql", "035_remove_owner_codes.sql", // safe to re-run
    "036_volunteer_code_names.sql", "036_volunteer_code_names.sql", "037_volunteer_codes_any_riders.sql",
    "038_volunteer_add_rider.sql", "038_volunteer_add_rider.sql",
  ]) await db.exec(sql(p));
  await db.exec("set role service_role");
}, 60000);
beforeEach(() => {
  for (const [k, v] of Object.entries({
    RTG_TIMING_CODES_ENABLED: "true", RTG_SESSION_TIMING_CODES_ENABLED: "true",
    RTG_TIMING_CODE_ORIGIN: origin, RTG_TIMING_CODE_PEPPER: pepper, RTG_LAYOUT_EDITOR_ADMIN_IDS: owner,
  })) vi.stubEnv(k, v);
});
afterAll(async () => { vi.unstubAllEnvs(); await db?.close(); });

it("owner sets up two sessions on the same day, with names", async () => {
  await admin({ type: "create_rider", name: "Rohit" });
  await admin({ type: "create_session", date: "2026-10-24" });
  await admin({ type: "create_session", date: "2026-10-24", name: "Evening" });
  expect((await state()).sessions.map((x) => x.name)).toEqual(["Session 1", "Evening"]);
}, 30000);

it("owner codes can no longer be issued", async () => {
  const res = await api({ action: "issue", scope: "advanced", expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  expect(res.statusCode).not.toBe(200);
  await db.exec("reset role");
  expect((await db.query("select count(*)::int n from ridge_timing_codes where scope='advanced'")).rows[0].n).toBe(0);
  await db.exec("set role service_role");
});

it("volunteer session code: timing, break, finish and resume pass the database's own checks", async () => {
  const s = await state();
  const evening = s.sessions[1], rider = s.riders[0].id;
  const issued = await api({ action: "issue", scope: "session_timing", sessionId: evening.id, volunteerName: "  Rohit Kumar  ", expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  expect(issued.statusCode, JSON.stringify(issued.body)).toBe(200);
  expect(issued.body.volunteerName).toBe("Rohit Kumar");
  // 036: the name is stored, listed (newest first) and given to the volunteer's timer.
  const list = await api({ action: "list" });
  expect(list.body[0]).toMatchObject({ volunteerName: "Rohit Kumar", scope: "session_timing" });
  const ex = await api({ action: "exchange", code: issued.body.code });
  cookie = ex.headers["set-cookie"].split(";")[0];
  expect((await api({ action: "read" })).body.volunteerName).toBe("Rohit Kumar");
  const t = Date.now() - 3000;
  for (const command of [
    { type: "attendance", sessionId: evening.id, riderIds: [rider] },
    { type: "group_start", sessionId: evening.id, at: t },
    { type: "pass", sessionId: evening.id, riderId: rider, lap: 1, at: t + 1000 },
    { type: "end", sessionId: evening.id, riderId: rider, lap: 2, at: t + 2000 },
    { type: "rider_finish", sessionId: evening.id, riderId: rider },
    { type: "rider_resume", sessionId: evening.id, riderId: rider },
    { type: "rider_finish", sessionId: evening.id, riderId: rider },
  ]) { const r = await volunteer(command); expect(r.statusCode, `${command.type}: ${JSON.stringify(r.body)}`).toBe(200); }
  expect((await state()).sessions[1].entries[0].done).toBe(true);
  // A finished rider takes no more taps.
  expect((await volunteer({ type: "start", sessionId: evening.id, riderId: rider, lap: 3, at: Date.now() })).statusCode).not.toBe(200);
  // Volunteers still can't do owner things.
  expect((await volunteer({ type: "link_rider", riderId: rider, profileId: member })).statusCode).not.toBe(200);
}, 30000);

it("038: a volunteer adds a missing rider, ticks them present and times them", async () => {
  const evening = (await state()).sessions[1], first = (await state()).riders[0].id;
  // The volunteer's view keeps the session name and who is marked done.
  const view = (await api({ action: "read" })).body.state;
  expect(view.sessions[0]).toMatchObject({ id: evening.id, name: "Evening" });
  expect(view.sessions[0].entries[0]).toMatchObject({ riderId: first, done: true });
  const riderId = crypto.randomUUID();
  const added = await volunteer({ type: "create_rider", sessionId: evening.id, name: "  Astha  ", riderId });
  expect(added.statusCode, JSON.stringify(added.body)).toBe(200);
  expect((await state()).riders.at(-1)).toEqual({ id: riderId, name: "Astha", photo: "" });
  // The save answers with the new records, so the timer needs no extra read.
  expect(added.body.version).toBe((await db.query("select version from ridge_workspace")).rows[0].version);
  expect(added.body.state.riders.map((r) => r.name)).toContain("Astha");
  // The same name twice, or a stray field, is refused.
  expect((await volunteer({ type: "create_rider", sessionId: evening.id, name: "astha", riderId: crypto.randomUUID() })).statusCode).not.toBe(200);
  expect((await volunteer({ type: "create_rider", sessionId: evening.id, name: "Mona", riderId: crypto.randomUUID(), photo: "x" })).statusCode).not.toBe(200);
  const t = Date.now() - 2000;
  for (const command of [
    { type: "attendance", sessionId: evening.id, riderIds: [first, riderId] },
    { type: "start", sessionId: evening.id, riderId, lap: 1, at: t },
    { type: "end", sessionId: evening.id, riderId, lap: 1, at: t + 1000 },
  ]) { const r = await volunteer(command); expect(r.statusCode, `${command.type}: ${JSON.stringify(r.body)}`).toBe(200); }
  expect((await state()).sessions[1].entries.find((e) => e.riderId === riderId).laps[0]).toMatchObject({ start: t, end: t + 1000 });
  // Adding is all: renaming stays with the admin.
  expect((await volunteer({ type: "edit_rider", sessionId: evening.id, riderId, name: "Astha K" })).statusCode).not.toBe(200);
}, 30000);

it("owner links the rider to a member, who then sees only their own published results", async () => {
  const rider = (await state()).riders[0].id;
  await admin({ type: "link_rider", riderId: rider, profileId: member, memberName: "Rohit K" });
  await admin({ type: "create_session", date: istDate(Date.now()), name: "Race" });
  const race = (await state()).sessions.find((x) => x.name === "Race");
  await admin({ type: "session_mode", sessionId: race.id, mode: "live", reason: "test" });
  const t = Date.now() - 3000;
  await admin({ type: "attendance", sessionId: race.id, riderIds: [rider] });
  await admin({ type: "group_start", sessionId: race.id, at: t });
  await admin({ type: "pass", sessionId: race.id, riderId: rider, lap: 1, at: t + 1000 });
  await admin({ type: "end", sessionId: race.id, riderId: rider, lap: 2, at: t + 2000 });
  await admin({ type: "rider_finish", sessionId: race.id, riderId: rider });
  await expect(admin({ type: "start", sessionId: race.id, riderId: rider, lap: 3, at: Date.now() })).rejects.toThrow(/marked finished/);
  await db.exec("reset role");
  const ask = async (uid) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    return (await db.query("select my_ridge_results() as r")).rows[0].r;
  };
  const mine = await ask(member);
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({ athlete_name: "Rohit", completed_laps: 2, session_label: "Race", finished: true, total_ms: 2000 });
  expect(await ask(stranger)).toEqual([]);
}, 30000);
