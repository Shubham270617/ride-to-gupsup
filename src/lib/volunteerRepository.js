import { validateVolunteerRole } from "./volunteerRoles";

const FIELDS = "id,title,team,location,plans,intro,tasks,fit,deliverable,ridge,sort_order,version";
function requireClient(client) {
  if (!client) throw new Error("The volunteer database connection is not configured.");
  return client;
}
function rolePayload(role) {
  const invalid = validateVolunteerRole(role);
  if (invalid) throw new Error(invalid);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role.id || "") || role.id.length > 80) throw new Error("Use a valid stable role ID.");
  return {
    id: role.id, title: role.title.trim(), team: role.team,
    location: (role.location || "").trim(), plans: [...new Set(role.plans)],
    intro: role.intro.trim(), tasks: role.tasks.map(task => task.trim()).filter(Boolean),
    fit: (role.fit || "").trim(), deliverable: (role.deliverable || "").trim(),
    ridge: role.ridge === true, sort_order: Number.isSafeInteger(role.sort_order) ? role.sort_order : 0,
  };
}
// Both tables are protected by the accompanying RLS plan. Never use a service
// credential here. Ordinary logged-in user sessions cannot edit role drafts.
export function createVolunteerRepository(client) {
  return {
    async listPublished() {
      const { data, error } = await requireClient(client).from("volunteer_roles").select(FIELDS).order("sort_order", { ascending: true });
      if (error) throw new Error("Volunteer roles could not be loaded.");
      return data || [];
    },
    async listDrafts() {
      const { data, error } = await requireClient(client).from("volunteer_role_drafts").select(FIELDS).order("sort_order", { ascending: true });
      if (error) throw new Error("Role drafts could not be loaded. Check your admin access.");
      return data || [];
    },
    async createDraft(role) {
      const payload = rolePayload(role);
      const { data, error } = await requireClient(client).from("volunteer_role_drafts").insert(payload).select(FIELDS).single();
      if (error || !data) throw new Error("Role draft could not be created. It may already exist or access may be unavailable.");
      return data;
    },
    async saveDraft(role) {
      const payload = rolePayload(role);
      if (!Number.isSafeInteger(role.version) || role.version < 1) throw new Error("Reload this role before saving its changes.");
      const { id, ...fields } = payload;
      const { data, error } = await requireClient(client).from("volunteer_role_drafts")
        .update(fields).eq("id", id).eq("version", role.version).select(FIELDS).maybeSingle();
      if (error) throw new Error("Role draft could not be saved. Check your admin access and try again.");
      if (!data) throw new Error("This role changed or is no longer available. Reload it before saving.");
      return data;
    },
  };
}
