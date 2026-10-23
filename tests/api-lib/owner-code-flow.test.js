import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createTimingCodeHandler } from "../../api-lib/timingCodes";
import { mockReq, mockRes } from "../helpers/http";

// The owner's "Advanced Settings" code, end to end through the real API
// handler and every Ridge migration that runs on the live database (Randeep's
// four plus 027-030): issue a code, enter it, add a rider, create a session.
const owner = "00000000-0000-4000-8000-000000000001";
const pepper = "synthetic-only-pepper-0000000000000000000";
const origin = "https://test.invalid";
const sql = (p) => readFileSync(new URL("../../supabase/migrations/" + p, import.meta.url), "utf8");
let db, cookie, credential;

// Minimal supabase-js stand-in over PGlite (same shape as session-timing-codes.test.js).
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

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    insert into auth.users values('${owner}','shub88510@gmail.com',now());
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create table profiles(id uuid primary key, strava_checked_at timestamptz);
    create table admin_profiles(id uuid primary key); insert into admin_profiles values('${owner}');
    create table lab_registrations(user_id uuid, programme_slug text);
    create function is_admin() returns boolean language sql as $$select false$$;
    grant usage on schema auth,public to service_role,authenticated,anon; grant select on admin_profiles,auth.users to service_role;`);
  for (const p of [
    "20261020211425_native_ridge_workspace.sql",
    "20261021152152_ridge_volunteer_timing_access.sql",
    "20261021170333_ridge_scoped_code_access_and_testing_dates.sql",
    "20261021174900_session_timing_codes.sql",
    "027_ridge_timing_account_removal.sql",
    "029_fixed_admin_emails.sql",
    "030_strava_checked_at.sql",
  ]) await db.exec(sql(p));
  await db.exec("set role service_role");
}, 30000);
beforeEach(() => {
  for (const [k, v] of Object.entries({
    RTG_TIMING_CODES_ENABLED: "true", RTG_SESSION_TIMING_CODES_ENABLED: "true",
    RTG_TIMING_CODE_ORIGIN: origin, RTG_TIMING_CODE_PEPPER: pepper, RTG_LAYOUT_EDITOR_ADMIN_IDS: owner,
  })) vi.stubEnv(k, v);
});
afterAll(async () => { vi.unstubAllEnvs(); await db?.close(); });

it("issues and enters an owner code", async () => {
  const issued = await api({ action: "issue", scope: "advanced", expiresAt: new Date(Date.now() + 3600_000).toISOString() });
  expect(issued.statusCode, JSON.stringify(issued.body)).toBe(200);
  credential = issued.body.id;
  const exchanged = await api({ action: "exchange", code: issued.body.code });
  expect(exchanged.statusCode, JSON.stringify(exchanged.body)).toBe(200);
  cookie = exchanged.headers["set-cookie"].split(";")[0];
  const read = await api({ action: "read" });
  expect(read.statusCode, JSON.stringify(read.body)).toBe(200);
  expect(read.body).toMatchObject({ scope: "advanced", version: 0 });
});

it("adds a rider, then creates a session, with the owner code", async () => {
  let read = await api({ action: "read" });
  const rider = await api({ action: "write", credentialId: credential, version: read.body.version, requestId: crypto.randomUUID(), command: { type: "create_rider", name: "Shubham" } });
  expect(rider.statusCode, JSON.stringify(rider.body)).toBe(200);
  read = await api({ action: "read" });
  expect(read.body.state.riders.map((r) => r.name)).toEqual(["Shubham"]);
  const session = await api({ action: "write", credentialId: credential, version: read.body.version, requestId: crypto.randomUUID(), command: { type: "create_session", date: "2026-10-23" } });
  expect(session.statusCode, JSON.stringify(session.body)).toBe(200);
  read = await api({ action: "read" });
  expect(read.body.state.sessions).toHaveLength(1);
});

it("a workspace whose version fell behind its audit trail refuses saves until migration 031 repairs it", async () => {
  // What the live database looked like: the workspace row was re-created at
  // version 0 while ridge_audit still held earlier saves (versions 1, 2, …).
  await db.exec("reset role");
  await db.query("update ridge_workspace set version = 0 where singleton");
  await db.query("update ridge_publication set version = 0 where singleton");
  await db.exec("set role service_role");
  let read = await api({ action: "read" });
  const refused = await api({ action: "write", credentialId: credential, version: read.body.version, requestId: crypto.randomUUID(), command: { type: "create_rider", name: "Simran" } });
  expect(refused.statusCode).toBe(409);
  expect(refused.body.error).toMatch(/Access or records changed/);

  await db.exec("reset role");
  await db.exec(sql("031_ridge_version_repair.sql"));
  await db.exec(sql("031_ridge_version_repair.sql")); // safe to run twice
  await db.exec("set role service_role");
  read = await api({ action: "read" });
  const saved = await api({ action: "write", credentialId: credential, version: read.body.version, requestId: crypto.randomUUID(), command: { type: "create_rider", name: "Simran" } });
  expect(saved.statusCode, JSON.stringify(saved.body)).toBe(200);
});

it("033: the owner code can take attendance and time a lap on its own", async () => {
  await db.exec("reset role");
  await db.exec(sql("033_owner_code_timing.sql"));
  await db.exec(sql("033_owner_code_timing.sql")); // safe to re-run
  await db.exec("set role service_role");
  let read = await api({ action: "read" });
  const session = read.body.state.sessions[0];
  const riderIds = read.body.state.riders.map((r) => r.id);
  const write = async (command) => {
    const r = await api({ action: "write", credentialId: credential, version: read.body.version, requestId: crypto.randomUUID(), command: { sessionId: session.id, ...command } });
    expect(r.statusCode, JSON.stringify(r.body)).toBe(200);
    read = await api({ action: "read" });
  };
  const t = Date.now() - 5000;
  await write({ type: "attendance", riderIds });
  await write({ type: "group_start", at: t });
  await write({ type: "pass", riderId: riderIds[0], lap: 1, at: t + 1000 });
  await write({ type: "end", riderId: riderIds[0], lap: 2, at: t + 2000 });
  const entry = read.body.state.sessions[0].entries.find((e) => e.riderId === riderIds[0]);
  expect(entry.laps).toHaveLength(2);
});

it("the clean-up script empties riders, sessions and codes but keeps versions moving", async () => {
  await db.exec("reset role");
  const before = (await db.query("select version from ridge_workspace")).rows[0].version;
  await db.exec(readFileSync(new URL("../../supabase/scripts/reset-ridge-test-data.sql", import.meta.url), "utf8"));
  const after = (await db.query("select version, state from ridge_workspace")).rows[0];
  expect(after.version).toBe(before);
  expect(after.state).toEqual({ schemaVersion: 1, riders: [], sessions: [] });
  expect((await db.query("select count(*)::int n from ridge_timing_codes")).rows[0].n).toBe(0);
});
