import { describe, it, expect } from "vitest";
import { createFakeSupabase } from "../../helpers/fakeSupabase";
import { createVolunteerRepository } from "../../../src/lib/volunteerRepository";
import { volunteerRoles } from "../../../src/lib/volunteerRoles";

describe("Volunteer draft persistence", () => {
  it("fails clearly without a database and never fakes a save", async () => {
    await expect(createVolunteerRepository(null).saveDraft({ ...volunteerRoles[0], version: 1 })).rejects.toThrow(/not configured/);
  });
  it("reads only the published snapshot for public visitors", async () => {
    const db = createFakeSupabase(); db.on("volunteer_roles", { data: [volunteerRoles[0]] });
    expect(await createVolunteerRepository(db).listPublished()).toHaveLength(1);
    expect(db.queries[0].table).toBe("volunteer_roles");
  });
  it("uses optimistic version matching and strips publication/pay/lead fields", async () => {
    const db = createFakeSupabase(); db.on("volunteer_role_drafts", { data: { ...volunteerRoles[0], version: 3 } });
    const result = await createVolunteerRepository(db).saveDraft({ ...volunteerRoles[0], version: 2, price: 999, lead: "Unapproved", applicationsOpen: true });
    expect(result.version).toBe(3);
    expect(db.queries[0].hasFilter("eq", "version", 2)).toBe(true);
    expect(db.queries[0].payload).not.toHaveProperty("price");
    expect(db.queries[0].payload).not.toHaveProperty("lead");
    expect(db.queries[0].payload).not.toHaveProperty("applicationsOpen");
    expect(db.queries[0].payload).not.toHaveProperty("version");
  });
  it("rejects an unavailable or changed record and RLS failure", async () => {
    const db = createFakeSupabase(); const repo = createVolunteerRepository(db);
    await expect(repo.saveDraft({ ...volunteerRoles[0], version: 1 })).rejects.toThrow(/changed/);
    db.on("volunteer_role_drafts", { error: { message: "row level security" } });
    await expect(repo.saveDraft({ ...volunteerRoles[0], version: 1 })).rejects.toThrow(/admin access/);
  });
  it("validates before issuing queries and requires a loaded version", async () => {
    const db = createFakeSupabase(); const repo = createVolunteerRepository(db);
    await expect(repo.saveDraft(volunteerRoles[0])).rejects.toThrow(/Reload/);
    await expect(repo.createDraft({ ...volunteerRoles[0], id: "../unsafe" })).rejects.toThrow(/valid stable/);
    expect(db.queries).toHaveLength(0);
  });
  it("confirms a new role only from returned persisted data", async () => {
    const db = createFakeSupabase(); const repo = createVolunteerRepository(db);
    await expect(repo.createDraft(volunteerRoles[0])).rejects.toThrow(/could not be created/);
    db.on("volunteer_role_drafts", { data: { ...volunteerRoles[0], version: 1 } });
    expect((await repo.createDraft(volunteerRoles[0])).version).toBe(1);
  });
});
