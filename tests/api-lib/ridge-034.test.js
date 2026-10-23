import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createTimingCodeHandler } from "../../api-lib/timingCodes";
import { mockReq, mockRes } from "../helpers/http";

// Migration 034 end to end: the real API handler + every Ridge migration on
// an in-memory Postgres. Owner code and volunteer (session) code both go
// through the database's own checks, so app and database must agree.
const owner = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const pepper = "synthetic-only-pepper-0000000000000000000";
const origin = "https://test.invalid";
const sql = (p) => readFileSync(new URL("../../supabase/migrations/" + p, import.meta.url), "utf8");
let db;
const cookies = {};

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
const api = async (who, body) => {
  const res = mockRes();
  await handler(mockReq({ method: "POST", headers: { origin, ...(cookies[who] ? { cookie: cookies[who] } : {}) }, body }), res);
  return res;
};
const enter = async (who, issueBody) => {
  const issued = await api(who, { action: "issue", expiresAt: new Date(Date.now() + 3600_000).toISOString(), ...issueBody });
  expect(issued.statusCode, JSON.stringify(issued.body)).toBe(200);
  const ex = await api(who, { action: "exchange", code: issued.body.code });
  expect(ex.statusCode, JSON.stringify(ex.body)).toBe(200);
  cookies[who] = ex.headers["set-cookie"].split(";")[0];
};
const write = async (who, command) => {
  const read = await api(who, { action: "read" });
  return api(who, { action: "write", credentialId: read.body.credentialId, version: read.body.version, requestId: crypto.randomUUID(), command });
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
    "034_ridge_rider_finish_and_members.sql", // safe to re-run
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
  await enter("owner", { scope: "advanced" });
  for (const command of [
    { type: "create_rider", name: "Rohit" },
    { type: "create_session", date: "2026-10-24" },
    { type: "create_session", date: "2026-10-24", name: "Evening" },
  ]) expect((await write("owner", command)).statusCode).toBe(200);
  const s = await state();
  expect(s.sessions.map((x) => x.name)).toEqual(["Session 1", "Evening"]);
}, 30000);

it("owner: a finished rider takes no more taps until resumed; laps are kept", async () => {
  const s = await state();
  const [session] = s.sessions, rider = s.riders[0].id;
  const t = Date.now() - 4000;
  for (const command of [
    { type: "attendance", sessionId: session.id, riderIds: [rider] },
    { type: "group_start", sessionId: session.id, at: t },
    { type: "end", sessionId: session.id, riderId: rider, lap: 1, at: t + 1000 },
    { type: "rider_finish", sessionId: session.id, riderId: rider },
  ]) { const r = await write("owner", command); expect(r.statusCode, JSON.stringify(r.body)).toBe(200); }
  const refused = await write("owner", { type: "start", sessionId: session.id, riderId: rider, lap: 2, at: t + 2000 });
  expect(refused.statusCode).toBe(400);
  expect(refused.body.error).toMatch(/marked finished/);
  expect((await write("owner", { type: "rider_resume", sessionId: session.id, riderId: rider })).statusCode).toBe(200);
  expect((await write("owner", { type: "start", sessionId: session.id, riderId: rider, lap: 2, at: t + 3000 })).statusCode).toBe(200);
  const entry = (await state()).sessions[0].entries[0];
  expect(entry).toMatchObject({ done: false });
  expect(entry.laps).toHaveLength(2);
}, 30000);

it("volunteer session code: finish and resume pass the database's own checks", async () => {
  const s = await state();
  const evening = s.sessions[1], rider = s.riders[0].id;
  await enter("volunteer", { scope: "session_timing", sessionId: evening.id });
  const t = Date.now() - 3000;
  for (const command of [
    { type: "attendance", sessionId: evening.id, riderIds: [rider] },
    { type: "group_start", sessionId: evening.id, at: t },
    { type: "pass", sessionId: evening.id, riderId: rider, lap: 1, at: t + 1000 },
    { type: "end", sessionId: evening.id, riderId: rider, lap: 2, at: t + 2000 },
    { type: "rider_finish", sessionId: evening.id, riderId: rider },
    { type: "rider_resume", sessionId: evening.id, riderId: rider },
    { type: "rider_finish", sessionId: evening.id, riderId: rider },
  ]) { const r = await write("volunteer", command); expect(r.statusCode, `${command.type}: ${JSON.stringify(r.body)}`).toBe(200); }
  expect((await state()).sessions[1].entries[0].done).toBe(true);
  // The volunteer still can't do owner things.
  expect((await write("volunteer", { type: "link_rider", riderId: rider, profileId: member })).statusCode).not.toBe(200);
}, 30000);

it("owner links the rider to a member, who then sees only their own published results", async () => {
  const { applyRidgeCommand, istDate } = await import("../../src/lib/ridge/engine.js");
  const rider = (await state()).riders[0].id;
  expect((await write("owner", { type: "link_rider", riderId: rider, profileId: member, memberName: "Rohit K" })).statusCode).toBe(200);
  // A clean session for today, published (Live) by the admin panel before timing.
  expect((await write("owner", { type: "create_session", date: istDate(Date.now()), name: "Race" })).statusCode).toBe(200);
  const race = (await state()).sessions.find((x) => x.name === "Race");
  await db.exec("reset role");
  const w = (await db.query("select state, version from ridge_workspace")).rows[0];
  const r = applyRidgeCommand(w.state, { type: "session_mode", sessionId: race.id, mode: "live", reason: "test" });
  await db.query("select ridge_commit($1,$2,$3,$4,$5,$6)", [w.version, crypto.randomUUID(), owner, r.state, r.feed, r.audit]);
  await db.exec("set role service_role");
  const t = Date.now() - 3000;
  for (const command of [
    { type: "attendance", sessionId: race.id, riderIds: [rider] },
    { type: "group_start", sessionId: race.id, at: t },
    { type: "pass", sessionId: race.id, riderId: rider, lap: 1, at: t + 1000 },
    { type: "end", sessionId: race.id, riderId: rider, lap: 2, at: t + 2000 },
    { type: "rider_finish", sessionId: race.id, riderId: rider },
  ]) { const res = await write("owner", command); expect(res.statusCode, JSON.stringify(res.body)).toBe(200); }
  await db.exec("reset role");
  const ask = async (uid) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    return (await db.query("select my_ridge_results() as r")).rows[0].r;
  };
  const mine = await ask(member);
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({ athlete_name: "Rohit", completed_laps: 2, session_label: "Race", finished: true });
  expect(mine[0].total_ms).toBe(2000);
  expect(await ask(stranger)).toEqual([]);
}, 30000);
