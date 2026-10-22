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
 it("shows five current leaders and proposed budgets with recruitment closed",()=>{page();expect(screen.getByText('Simran')).toBeInTheDocument();expect(screen.getByText('Manish Jayal (iRide2Reach)')).toBeInTheDocument();expect(screen.getAllByText('Vacant')).toHaveLength(3);expect(screen.getByRole('status')).toHaveTextContent('7 roles');expect(screen.getByText(/Applications are not open yet/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:/apply|submit/i})).not.toBeInTheDocument();expect(VOLUNTEER_APPLICATIONS_OPEN).toBe(false);});
 it("changes cadence with explicit included workload and filters categories",async()=>{const user=userEvent.setup();page();await user.click(screen.getByRole('button',{name:'Monthly',exact:true}));expect(screen.getByRole('status')).toHaveTextContent('7 roles');expect(screen.getAllByText('Starting package · 4 sessions')).toHaveLength(7);await user.click(screen.getByRole('button',{name:'Photography',exact:true}));expect(screen.getByRole('status')).toHaveTextContent('1 role');await user.type(screen.getByLabelText('Search roles'),'nothing');expect(screen.getByText('No roles match those filters.')).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Clear filters'}));expect(screen.getByRole('status')).toHaveTextContent('7 roles');});
 it("opens accessible detail dialog, preserves filters, and closes by Escape",async()=>{const user=userEvent.setup();page('/volunteer?team=Photography');const trigger=screen.getByRole('button',{name:'View Event photographer'});await user.click(trigger);expect(screen.getByRole('dialog')).toHaveAccessibleName('Event photographer');expect(screen.getByRole('heading',{name:'What you would help with'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Close role details'})).toHaveFocus();await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();expect(screen.getByRole('button',{name:'Photography',exact:true})).toHaveAttribute('aria-pressed','true');});
 it("supports linked details and browser history without unsafe query rendering",async()=>{const user=userEvent.setup();render(<MemoryRouter initialEntries={['/volunteer?role=crew-reels']}><HistoryControls/><Volunteer/></MemoryRouter>);expect(screen.getByRole('dialog')).toHaveAccessibleName('Reels & video editor');await user.click(screen.getByRole('button',{name:'Close role details'}));await user.click(screen.getByRole('button',{name:'History back'}));expect(screen.getByRole('dialog')).toBeInTheDocument();});
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

