import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VolunteerAdmin from "../../../src/admin/pages/VolunteerAdmin";
import { volunteerRoles } from "../../../src/lib/volunteerRoles";
import { createFakeSupabase } from "../../helpers/fakeSupabase";

describe("Volunteer admin integration", () => {
  it("locks reference selection and repeated creation until the save is confirmed", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup(); let finish;
    client.on("volunteer_role_drafts", { data: [] }, { action: "select" });
    const from = client.from.bind(client);
    const insert = vi.fn(() => ({ select: () => ({ single: () => new Promise(resolve => { finish = resolve; }) }) }));
    client.from = table => ({ ...from(table), insert });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    await screen.findByLabelText("Reference role");
    await user.click(screen.getByRole("button", { name: "Create draft from reference" }));
    expect(screen.getByRole("button", { name: "Creating draft…" })).toBeDisabled();
    expect(screen.getByLabelText("Reference role")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Creating draft…" }));
    expect(insert).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Role draft created/)).not.toBeInTheDocument();
    finish({ data: { ...volunteerRoles[0], version: 1 }, error: null });
    expect(await screen.findByRole("status")).toHaveTextContent("Role draft created");
  });
  it("does not automatically seed an empty table and creates only the selected private draft", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    client.on("volunteer_role_drafts", { data: [] }, { action: "select" });
    client.on("volunteer_role_drafts", q => ({ data: { ...q.payload, version: 1 } }), { action: "insert" });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    await screen.findByLabelText("Reference role");
    expect(client.queries.filter(q => q.action === "insert")).toHaveLength(0);
    await user.selectOptions(screen.getByLabelText("Reference role"), "photographer");
    await user.click(screen.getByRole("button", { name: "Create draft from reference" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Nothing was published");
    expect(screen.getByLabelText("Role title")).toHaveValue("Community photographer");
    const writes = client.queries.filter(q => q.action === "insert");
    expect(writes).toHaveLength(1); expect(writes[0].payload.id).toBe("photographer");
    expect(client.queries.every(q => q.table === "volunteer_role_drafts")).toBe(true);
    expect(within(screen.getByLabelText("Reference role")).queryByRole("option", { name: "Community photographer" })).not.toBeInTheDocument();
  });
  it("offers no false success on duplicate/failure", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    client.on("volunteer_role_drafts", { data: [] }, { action: "select" });
    client.on("volunteer_role_drafts", { error: { code: "23505", message: "duplicate key" } }, { action: "insert" });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    await screen.findByLabelText("Reference role");
    await user.click(screen.getByRole("button", { name: "Create draft from reference" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No creation was confirmed");
    expect(screen.queryByText(/Role draft created/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload drafts" })).toBeEnabled();
  });
  it("does not create a different draft while current edits are unsaved", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    client.on("volunteer_role_drafts", { data: [{ ...volunteerRoles[0], version: 1 }] }, { action: "select" });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    await screen.findByLabelText("Role title");
    await user.type(screen.getByLabelText("Role title"), " edited");
    expect(screen.getByRole("button", { name: "Create draft from reference" })).toBeDisabled();
    expect(screen.getByLabelText("Reference role")).toBeDisabled();
    expect(client.queries.filter(q => q.action === "insert")).toHaveLength(0);
  });
  it("excludes existing reference drafts instead of offering duplicates", async () => {
    const client = createFakeSupabase();
    client.on("volunteer_role_drafts", { data: volunteerRoles.map(role => ({ ...role, version: 1 })) }, { action: "select" });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    expect(await screen.findByText(/Every reference role already has a draft/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create draft from reference" })).not.toBeInTheDocument();
  });
  it("defaults to a no-network, no-save preview and protects unsaved edits", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    render(<VolunteerAdmin client={client} />);
    expect(client.queries).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Save role draft" })).toBeDisabled();
    await user.type(screen.getByLabelText("Role title"), " changed");
    await user.selectOptions(screen.getByLabelText("Choose role"), "ridge-timing");
    expect(screen.getByRole("alert")).toHaveTextContent("unsaved changes");
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Role title")).toHaveValue(`${volunteerRoles[0].title} changed`);
    await user.selectOptions(screen.getByLabelText("Choose role"), "ridge-timing");
    await user.click(screen.getByRole("button", { name: "Discard changes and switch" }));
    expect(screen.getByLabelText("Role title")).toHaveValue(volunteerRoles[1].title);
  });
  it("reports setup/permission failure and can retry without showing sample rows as live", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    client.on("volunteer_role_drafts", { error: { message: "permission denied" } }, { times: 1 });
    client.on("volunteer_role_drafts", { data: [{ ...volunteerRoles[0], version: 1 }] });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    expect(await screen.findByRole("alert")).toHaveTextContent("admin access");
    expect(screen.queryByLabelText("Role title")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("Role title")).toHaveValue(volunteerRoles[0].title);
  });
  it("retains the returned version across consecutive saves", async () => {
    const client = createFakeSupabase(); const user = userEvent.setup();
    client.on("volunteer_role_drafts", { data: [{ ...volunteerRoles[0], version: 1 }] }, { action: "select" });
    client.on("volunteer_role_drafts", q => ({ data: { ...volunteerRoles[0], ...q.payload, version: q.filterValue("eq", "version") + 1 } }), { action: "update" });
    render(<VolunteerAdmin client={client} persistenceEnabled />);
    await screen.findByLabelText("Role title");
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Role draft saved");
    await user.type(screen.getByLabelText("Role title"), " revised");
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Role draft saved");
    const writes = client.queries.filter(q => q.action === "update");
    expect(writes.map(q => q.filterValue("eq", "version"))).toEqual([1, 2]);
  });
});
