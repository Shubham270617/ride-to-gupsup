import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

it("032 deletes only the sample athletes, keeps hand-entered activities, and is safe to re-run", async () => {
  const db = new PGlite();
  await db.exec(`create table lab_activities(id serial primary key, athlete_name text not null, is_sample boolean not null default false);
    insert into lab_activities(athlete_name, is_sample) values ('Naina J.', true), ('Arjun N.', true), ('Real Rider', false);`);
  const sql = readFileSync(new URL("../../supabase/migrations/032_remove_sample_lab_activities.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const { rows } = await db.query("select athlete_name from lab_activities");
  expect(rows).toEqual([{ athlete_name: "Real Rider" }]);
  await db.close();
});

it("016 no longer re-creates the sample athletes", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/016_lab_and_membership.sql", import.meta.url), "utf8");
  const start = sql.indexOf("insert into lab_activities");
  const seed = sql.slice(start, sql.indexOf("-- Ridge Repeats", start));
  expect(seed).toMatch(/and false;/);
});
