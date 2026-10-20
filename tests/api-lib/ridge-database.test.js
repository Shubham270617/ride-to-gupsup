import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
let db;
const actor = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const request = "00000000-0000-4000-8000-000000000003";
const state = { schemaVersion: 1, riders: [], sessions: [] },
  feed = { sessions: [], results: [], awards: [], spotlights: [] },
  audit = { type: "test", command: { type: "test" } };
const commit = (
  version = 0,
  id = request,
  who = actor,
  s = state,
  f = feed,
  a = audit,
) =>
  db.query("select public.ridge_commit($1,$2,$3,$4,$5,$6) as version", [
    version,
    id,
    who,
    s,
    f,
    a,
  ]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; grant usage on schema auth,public to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.admin_profiles(id uuid primary key);insert into public.admin_profiles values('${actor}');
 create table public.lab_registrations(user_id uuid, programme_slug text);insert into public.lab_registrations values('${member}','ridge-repeats');
 create function public.is_admin() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.admin_profiles where id=auth.uid())$$;
 grant select on public.admin_profiles,public.lab_registrations to service_role;grant select on public.lab_registrations to authenticated;`);
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261020211425_native_ridge_workspace.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => await db?.close());
it("anonymous and member roles cannot write or call the commit function", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(commit()).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.exec("update ridge_workspace set version=99"),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  }
});
it("RLS hides workspace and audit from members and requires Ridge registration for results", async () => {
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`);
  expect((await db.query("select * from ridge_workspace")).rows).toHaveLength(
    0,
  );
  expect((await db.query("select * from ridge_audit")).rows).toHaveLength(0);
  expect((await db.query("select * from ridge_publication")).rows).toHaveLength(
    1,
  );
  await db.exec(
    `set request.jwt.claim.sub='00000000-0000-4000-8000-000000000099'`,
  );
  expect((await db.query("select * from ridge_publication")).rows).toHaveLength(
    0,
  );
  await db.exec(`set request.jwt.claim.sub='${actor}'`);
  expect((await db.query("select * from ridge_workspace")).rows).toHaveLength(
    1,
  );
  await db.exec("reset role");
});
it("commits state, publication and audit together, and retries are idempotent", async () => {
  await db.exec("set role service_role");
  expect((await commit()).rows[0].version).toBe(1);
  expect((await commit()).rows[0].version).toBe(1);
  expect(
    (await db.query("select version from ridge_workspace")).rows[0].version,
  ).toBe(1);
  expect(
    (await db.query("select version from ridge_publication")).rows[0].version,
  ).toBe(1);
  expect((await db.query("select * from ridge_audit")).rows).toHaveLength(1);
  await expect(
    commit(0, "00000000-0000-4000-8000-000000000004"),
  ).rejects.toMatchObject({ code: "40001" });
  await expect(
    commit(1, request, actor, state, feed, {
      type: "different",
      command: { type: "different" },
    }),
  ).rejects.toMatchObject({ code: "23505" });
  await expect(
    commit(1, "00000000-0000-4000-8000-000000000004", member),
  ).rejects.toMatchObject({ code: "42501" });
  expect(
    (await db.query("select version from ridge_workspace")).rows[0].version,
  ).toBe(1);
  await db.exec("reset role");
});
it("an audit constraint failure rolls back both data updates", async () => {
  await db.exec(
    "alter table ridge_audit add constraint reject_test check (action <> 'rejected');set role service_role;",
  );
  await expect(
    commit(
      1,
      "00000000-0000-4000-8000-000000000004",
      actor,
      { ...state, riders: [{ name: "Lost write" }] },
      feed,
      { type: "rejected", command: { type: "rejected" } },
    ),
  ).rejects.toMatchObject({ code: "23514" });
  expect(
    (await db.query("select state,version from ridge_workspace")).rows[0],
  ).toEqual({ state, version: 1 });
  expect(
    (await db.query("select version from ridge_publication")).rows[0].version,
  ).toBe(1);
  await db.exec("reset role");
});
