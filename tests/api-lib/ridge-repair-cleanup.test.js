import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { applyRidgeCommand } from "../../src/lib/ridge/engine.js";

// Ridge maintenance SQL on an in-memory Postgres: 031 (version repair), the
// one-off test-data reset script, and 035 (owner codes removed).
const owner = "00000000-0000-4000-8000-000000000001";
const file = (p) => readFileSync(new URL("../../supabase/" + p, import.meta.url), "utf8");
const sql = (p) => file("migrations/" + p);
let db;

const commit = async (command) => {
  const w = (await db.query("select state, version from ridge_workspace")).rows[0];
  const r = applyRidgeCommand(w.state, command);
  return db.query("select ridge_commit($1,$2,$3,$4,$5,$6)", [w.version, crypto.randomUUID(), owner, r.state, r.feed, r.audit]);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    insert into auth.users values('${owner}','shub88510@gmail.com',now());
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create table admin_profiles(id uuid primary key); insert into admin_profiles values('${owner}');
    create table lab_registrations(user_id uuid, programme_slug text);
    create function is_admin() returns boolean language sql as $$select false$$;
    grant usage on schema auth,public to service_role,authenticated,anon; grant select on admin_profiles,auth.users to service_role;`);
  for (const p of [
    "20261020211425_native_ridge_workspace.sql", "20261021152152_ridge_volunteer_timing_access.sql",
    "20261021170333_ridge_scoped_code_access_and_testing_dates.sql", "20261021174900_session_timing_codes.sql",
    "027_ridge_timing_account_removal.sql",
  ]) await db.exec(sql(p));
}, 60000);
afterAll(async () => db?.close());

it("031: a workspace whose version fell behind its audit trail refuses saves until repaired", async () => {
  await commit({ type: "create_rider", name: "Rohit" });
  await commit({ type: "create_rider", name: "Simran" });
  // What the live database looked like: the row re-created at version 0
  // while ridge_audit still held saves 1 and 2.
  await db.exec("update ridge_workspace set version = 0; update ridge_publication set version = 0");
  await expect(commit({ type: "create_rider", name: "Test A" })).rejects.toMatchObject({ code: "23505" });
  await db.exec(sql("031_ridge_version_repair.sql"));
  await db.exec(sql("031_ridge_version_repair.sql")); // safe to re-run
  await expect(commit({ type: "create_rider", name: "Test A" })).resolves.toBeDefined();
});

it("035 deletes existing owner codes (and their sign-ins), keeps volunteer codes, and blocks new owner codes", async () => {
  await db.exec(sql("033_owner_code_timing.sql"));
  await db.exec(sql("034_ridge_rider_finish_and_members.sql"));
  await commit({ type: "create_session", date: "2026-10-24", name: "Evening" });
  const session = (await db.query("select state from ridge_workspace")).rows[0].state.sessions[0].id;
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  // One owner code (as made before 035) with a signed-in browser, one volunteer code.
  await db.query("select ridge_code_access('issue', $1)", [{ actor: owner, scope: "advanced", codeHash: "a".repeat(64), expiresAt }]);
  await db.query("select ridge_code_access('exchange', $1)", [{ codeHash: "a".repeat(64), sessionHash: "b".repeat(64), networkKey: "n".repeat(64), expiresAt }]).catch(() => {});
  await db.query("select ridge_code_access('issue', $1)", [{ actor: owner, scope: "session_timing", sessionId: session, codeHash: "c".repeat(64), expiresAt }]);
  expect((await db.query("select count(*)::int n from ridge_timing_codes")).rows[0].n).toBe(2);

  await db.exec(sql("035_remove_owner_codes.sql"));
  await db.exec(sql("035_remove_owner_codes.sql")); // safe to re-run
  const left = (await db.query("select scope from ridge_timing_codes")).rows.map((r) => r.scope);
  expect(left).toEqual(["session_timing"]);
  expect((await db.query("select count(*)::int n from ridge_timing_code_sessions s join ridge_timing_codes c on c.id = s.code_id where c.scope = 'advanced'")).rows[0].n).toBe(0);
  await expect(db.query("select ridge_code_access('issue', $1)", [{ actor: owner, scope: "advanced", codeHash: "d".repeat(64), expiresAt }])).rejects.toThrow();
});

it("the clean-up script empties riders, sessions and codes but keeps versions moving", async () => {
  const before = (await db.query("select version from ridge_workspace")).rows[0].version;
  await db.exec(file("scripts/reset-ridge-test-data.sql"));
  const after = (await db.query("select version, state from ridge_workspace")).rows[0];
  expect(after.version).toBe(before);
  expect(after.state).toEqual({ schemaVersion: 1, riders: [], sessions: [] });
  expect((await db.query("select count(*)::int n from ridge_timing_codes")).rows[0].n).toBe(0);
  await expect(commit({ type: "create_rider", name: "After reset" })).resolves.toBeDefined();
});

it("037: a volunteer code can be made with no riders, and sees riders added later", async () => {
  await db.exec(sql("036_volunteer_code_names.sql"));
  await db.exec(sql("037_volunteer_codes_any_riders.sql"));
  await db.exec(sql("037_volunteer_codes_any_riders.sql")); // safe to re-run
  // Start from no riders at all.
  await db.exec(file("scripts/reset-ridge-test-data.sql"));
  await commit({ type: "create_session", date: "2026-10-24", name: "Race" });
  const state = (await db.query("select state from ridge_workspace")).rows[0].state;
  expect(state.riders).toHaveLength(0);
  const session = state.sessions.at(-1).id;
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  await db.query("select ridge_code_access('issue', $1)", [{ actor: owner, scope: "session_timing", sessionId: session, codeHash: "e".repeat(64), expiresAt, volunteerName: "Astha Kumari" }]);
  await db.query("select ridge_code_access('exchange', $1)", [{ codeHash: "e".repeat(64), sessionHash: "f".repeat(64), networkKey: "g".repeat(64), expiresAt }]);
  const read = async () => (await db.query("select ridge_code_access('read', $1) as r", [{ sessionHash: "f".repeat(64) }])).rows[0].r;
  expect(await read()).toMatchObject({ volunteerName: "Astha Kumari", rosterIds: [] });
  await commit({ type: "create_rider", name: "Rohit" });
  const riderId = (await db.query("select state from ridge_workspace")).rows[0].state.riders[0].id;
  expect((await read()).rosterIds).toEqual([riderId]);
});
