import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

// Runs Randeep's four Ridge migrations and our 027 + 028 on a real
// (in-memory) Postgres, in the order they go to the live database.
const MIGRATIONS = [
  "20261020211425_native_ridge_workspace.sql",
  "20261021152152_ridge_volunteer_timing_access.sql",
  "20261021170333_ridge_scoped_code_access_and_testing_dates.sql",
  "20261021174900_session_timing_codes.sql",
  "027_ridge_timing_account_removal.sql",
  "028_volunteer_roles.sql",
];
const sql = (name) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");

const admin = "00000000-0000-4000-8000-000000000001";
const volunteer = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values('${admin}'),('${volunteer}'),('${other}');
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.admin_profiles(id uuid primary key); insert into public.admin_profiles values('${admin}');
    create table public.lab_registrations(user_id uuid, programme_slug text);
    create function public.is_admin() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.admin_profiles where id=auth.uid())$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant select on public.admin_profiles,public.lab_registrations,auth.users to service_role;`);
  for (const name of MIGRATIONS) await db.exec(sql(name));
}, 30000);
afterAll(async () => db?.close());

const assign = (user) =>
  db.query(
    "insert into ridge_timing_assignments(user_id,session_id,expires_at,assigned_by) values($1,'s1',now()+interval '1 hour',$2)",
    [user, admin]
  );

describe("027 — removing an admin or an account", () => {
  it("can be run twice", async () => {
    await expect(db.exec(sql("027_ridge_timing_account_removal.sql"))).resolves.toBeDefined();
  });

  it("revoking an admin keeps their volunteer assignments, with assigned_by emptied", async () => {
    await assign(volunteer);
    await db.query("delete from admin_profiles where id=$1", [admin]);
    const { rows } = await db.query("select assigned_by from ridge_timing_assignments where user_id=$1", [volunteer]);
    expect(rows).toEqual([{ assigned_by: null }]);
    await db.query("insert into admin_profiles values($1)", [admin]);
  });

  it("deleting a volunteer's account removes their assignments", async () => {
    await assign(other);
    await db.query("delete from auth.users where id=$1", [other]);
    const { rows } = await db.query("select 1 from ridge_timing_assignments where user_id=$1", [other]);
    expect(rows).toHaveLength(0);
  });
});

describe("028 — RTG Crew roles", () => {
  const role = { id: "crew-media", title: "Media", team: "Media", plans: ["One day"], intro: "Capture the ride." };
  const as = async (who, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${who}',false)`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub','',false)");
    }
  };
  const insertDraft = () =>
    db.query("insert into volunteer_role_drafts(id,title,team,plans,intro) values($1,$2,$3,$4,$5)", [role.id, role.title, role.team, role.plans, role.intro]);

  it("can be run twice", async () => {
    await expect(db.exec(sql("028_volunteer_roles.sql"))).resolves.toBeDefined();
  });

  it("only admins can write or read drafts", async () => {
    await expect(as(volunteer, insertDraft)).rejects.toThrow();
    await as(admin, insertDraft);
    expect((await as(volunteer, () => db.query("select id from volunteer_role_drafts"))).rows).toHaveLength(0);
    expect((await as(admin, () => db.query("select id from volunteer_role_drafts"))).rows).toHaveLength(1);
  });

  it("bumps the version on every save", async () => {
    await as(admin, () => db.query("update volunteer_role_drafts set title='Media crew' where id=$1", [role.id]));
    const { rows } = await db.query("select version from volunteer_role_drafts where id=$1", [role.id]);
    expect(rows[0].version).toBe(2);
  });

  it("visitors can read published roles but not change them", async () => {
    await db.query("insert into volunteer_roles(id,title,team,plans,intro) values($1,$2,$3,$4,$5)", [role.id, role.title, role.team, role.plans, role.intro]);
    await db.exec("set role anon");
    try {
      expect((await db.query("select id from volunteer_roles")).rows).toHaveLength(1);
      await expect(db.query("delete from volunteer_roles")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
});
