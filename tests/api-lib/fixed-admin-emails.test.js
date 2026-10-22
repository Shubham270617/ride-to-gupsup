import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

// Runs migration 029 on a real (in-memory) Postgres holding a mix of
// admins: the 3 fixed emails plus an old "first 3" admin who isn't on it.
const sql = readFileSync(new URL("../../supabase/migrations/029_fixed_admin_emails.sql", import.meta.url), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const people = [
  [id(1), "Wheelikx@gmail.com", true], // listed, confirmed, already admin
  [id(2), "old.admin@example.com", true], // not listed, was an admin
  [id(3), "shub88510@gmail.com", true], // listed, confirmed, not admin yet
  [id(4), "simranbaghelgame@gmail.com", false], // listed, NOT confirmed
  [id(5), "member@example.com", true], // ordinary member
];
let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table admin_profiles(id uuid primary key references auth.users(id));`);
  for (const [uid, email, confirmed] of people) {
    await db.query("insert into auth.users values($1,$2,$3)", [uid, email, confirmed ? new Date() : null]);
  }
  await db.query("insert into admin_profiles values($1),($2)", [id(1), id(2)]);
  await db.exec(sql);
}, 30000);
afterAll(async () => db?.close());

const isAdmin = async (uid) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  return (await db.query("select is_admin() as ok")).rows[0].ok;
};

describe("029 — admins are 3 fixed emails", () => {
  it("removes admin access from accounts not on the list, keeps the listed admin", async () => {
    const { rows } = await db.query("select id from admin_profiles order by id");
    expect(rows.map((r) => r.id)).toEqual([id(1)]);
  });

  it("is_admin() is true only for a listed, confirmed email with an admin row", async () => {
    expect(await isAdmin(id(1))).toBe(true);
    expect(await isAdmin(id(2))).toBe(false);
    expect(await isAdmin(id(5))).toBe(false);
  });

  it("lets a listed, confirmed email become an admin", async () => {
    await db.query("insert into admin_profiles values($1)", [id(3)]);
    expect(await isAdmin(id(3))).toBe(true);
  });

  it("refuses an admin row for any other email, or an unconfirmed admin email", async () => {
    await expect(db.query("insert into admin_profiles values($1)", [id(5)])).rejects.toThrow(/RTG admin email/);
    await expect(db.query("insert into admin_profiles values($1)", [id(4)])).rejects.toThrow(/RTG admin email/);
  });

  it("matches emails whatever their case or spaces", async () => {
    expect((await db.query("select admin_email_allowed('  WHEELIKX@GMAIL.COM ') as ok")).rows[0].ok).toBe(true);
    expect((await db.query("select admin_email_allowed('wheelikx@gmail.com.evil') as ok")).rows[0].ok).toBe(false);
  });

  it("can be run again safely", async () => {
    await expect(db.exec(sql)).resolves.toBeDefined();
    const { rows } = await db.query("select count(*)::int as n from admin_profiles");
    expect(rows[0].n).toBe(2);
  });
});
