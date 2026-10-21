import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Volunteer from "../../../src/pages/Volunteer";
import VolunteerRoleEditor from "../../../src/components/volunteer/VolunteerRoleEditor";
import { volunteerRoles, VOLUNTEER_APPLICATIONS_OPEN, filterVolunteerRoles, validateVolunteerRole } from "../../../src/lib/volunteerRoles";

function page(path = "/volunteer") { return render(<MemoryRouter initialEntries={[path]}><Volunteer /></MemoryRouter>); }
function HistoryControls() { const navigate = useNavigate(); return <><button onClick={() => navigate(-1)}>History back</button><button onClick={() => navigate(1)}>History forward</button></>; }
describe("Crew role preview", () => {
  it("shows all reference roles without opening recruitment or exposing draft rates/leads", () => {
    page();
    expect(screen.getByRole("status")).toHaveTextContent("11 roles");
    expect(screen.getByText(/applications are not open yet/i)).toBeInTheDocument();
    expect(VOLUNTEER_APPLICATIONS_OPEN).toBe(false);
    expect(screen.queryByRole("button", { name: /apply|submit/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Hitesh|Simran|Manish Shiva|₹/)).not.toBeInTheDocument();
    expect(volunteerRoles.every(role => !('price' in role) && !('lead' in role))).toBe(true);
  });
  it("filters by team and commitment, and clears an empty search", async () => {
    const user = userEvent.setup(); page();
    await user.selectOptions(screen.getByLabelText("Team"), "Media");
    await user.selectOptions(screen.getByLabelText("Commitment"), "Weekly");
    expect(screen.getByRole("status")).toHaveTextContent("2 roles");
    await user.type(screen.getByLabelText("Search roles"), "doesnotexist");
    expect(screen.getByText("No roles match those filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("status")).toHaveTextContent("11 roles");
  });
  it("supports linked details and closing without collecting applications", async () => {
    const user = userEvent.setup(); page("/volunteer?role=ridge-timing&team=Logistics");
    expect(screen.getByRole("heading", { name: "What you would help with" })).toBeInTheDocument();
    expect(screen.getByText(/Applications closed. No personal details/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close role details/ }));
    expect(screen.queryByRole("heading", { name: "What you would help with" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Team")).toHaveValue("Logistics");
  });
  it("ignores invalid filters and never injects query HTML", () => {
    page("/volunteer?team=bogus&role=missing&q=%3Cscript%3E");
    expect(screen.getByLabelText("Team")).toHaveValue("All");
    expect(screen.queryByRole("heading", { name: "What you would help with" })).not.toBeInTheDocument();
  });
  it("restores filters and details through browser history", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><HistoryControls /><Volunteer /></MemoryRouter>);
    await user.selectOptions(screen.getByLabelText("Team"), "Coaching");
    await user.click(screen.getByRole("button", { name: "View Athlete support & coaching assistant" }));
    expect(screen.getByRole("heading", { name: "What you would help with" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.queryByRole("heading", { name: "What you would help with" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Team")).toHaveValue("Coaching");
    await user.click(screen.getByRole("button", { name: "History forward" }));
    expect(screen.getByRole("heading", { name: "What you would help with" })).toBeInTheDocument();
  });
});
describe("Volunteer model", () => {
  it("matches text without case sensitivity and validates content", () => {
    expect(filterVolunteerRoles(volunteerRoles, { search: "  TIMING " })).toHaveLength(1);
    expect(validateVolunteerRole({ ...volunteerRoles[0], plans: [] })).toMatch(/commitment/);
    expect(validateVolunteerRole({ ...volunteerRoles[0], title: " " })).toMatch(/title/);
    expect(validateVolunteerRole(volunteerRoles[0])).toBe("");
  });
});
describe("Admin draft editor", () => {
  it("does not pretend to save when no backend is connected", () => {
    render(<VolunteerRoleEditor role={volunteerRoles[0]} />);
    expect(screen.getByRole("button", { name: "Save role draft" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("not connected");
  });
  it("shows success only after confirmed persistence", async () => {
    const save = vi.fn(async role => role); const user = userEvent.setup();
    render(<VolunteerRoleEditor role={volunteerRoles[0]} onSave={save} />);
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Applications remain closed");
  });
  it("keeps edits on failure and allows retry without false success", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockImplementationOnce(async role => role);
    const user = userEvent.setup(); render(<VolunteerRoleEditor role={volunteerRoles[0]} onSave={save} />);
    await user.type(screen.getByLabelText("Role title"), " updated");
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByLabelText("Role title")).toHaveValue(`${volunteerRoles[0].title} updated`);
    expect(screen.queryByText(/Role draft saved/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Role draft saved");
  });
  it("blocks repeat save and cancel while a request is pending", async () => {
    let finish; const save = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const cancel = vi.fn(); const user = userEvent.setup();
    render(<VolunteerRoleEditor role={volunteerRoles[0]} onSave={save} onCancel={cancel} />);
    await user.click(screen.getByRole("button", { name: "Save role draft" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Saving…" }));
    expect(save).toHaveBeenCalledTimes(1); expect(cancel).not.toHaveBeenCalled();
    finish(volunteerRoles[0]);
    expect(await screen.findByRole("status")).toHaveTextContent("Role draft saved");
  });
});
