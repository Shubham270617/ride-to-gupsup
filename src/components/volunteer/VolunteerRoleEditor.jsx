import { useState } from "react";
import { VOLUNTEER_TEAMS, VOLUNTEER_COMMITMENTS, validateVolunteerRole } from "../../lib/volunteerRoles";

// Mount only inside the existing authenticated admin layout. `onSave` must
// perform an authorized server write and return the stored role, or reject.
// No fallback localStorage save and no recruitment-opening switch are provided.
export default function VolunteerRoleEditor({ role, onSave, onCancel, onDirtyChange, onBusyChange }) {
  const [draft, setDraft] = useState(() => ({ ...role, plans: [...(role.plans || [])] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function change(name, value) { setDraft(current => ({ ...current, [name]: value })); setSaved(false); onDirtyChange?.(true); }
  async function submit(event) {
    event.preventDefault();
    if (busy || !onSave) return;
    const invalid = validateVolunteerRole(draft);
    if (invalid) { setError(invalid); return; }
    setBusy(true); onBusyChange?.(true); setError(""); setSaved(false);
    try {
      const stored = await onSave({ ...draft, title: draft.title.trim(), intro: draft.intro.trim() });
      if (!stored || stored.id !== role.id) throw new Error("Save was not confirmed. Please try again.");
      setDraft({ ...stored, plans: [...stored.plans] }); setSaved(true); onDirtyChange?.(false);
    } catch { setError("The role could not be saved. Your edits are still here; please try again."); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <form onSubmit={submit} className="space-y-5" aria-label="Edit volunteer role">
    <h2 className="text-2xl font-display">Edit role draft</h2>
    <p className="text-sm text-rtg-mist">This edits role content only. Recruitment stays closed until the programme, privacy process and terms are approved.</p>
    {!onSave && <p role="status">Database saving is not connected in this preview. You can inspect the fields, but edits will not be saved.</p>}
    <fieldset disabled={busy} className="space-y-4">
      <label className="block">Role title<input className="block w-full rounded border p-3" value={draft.title || ""} maxLength={120} required onChange={e => change("title", e.target.value)} /></label>
      <label className="block">Team<select className="block w-full rounded border p-3" value={draft.team || ""} required onChange={e => change("team", e.target.value)}><option value="">Choose a team</option>{VOLUNTEER_TEAMS.map(team => <option key={team}>{team}</option>)}</select></label>
      <label className="block">Description<textarea className="block w-full rounded border p-3" value={draft.intro || ""} maxLength={1500} required rows={4} onChange={e => change("intro", e.target.value)} /></label>
      <label className="block">Location<input className="block w-full rounded border p-3" value={draft.location || ""} maxLength={200} onChange={e => change("location", e.target.value)} /></label>
      <label className="block">Responsibilities (one per line)<textarea className="block w-full rounded border p-3" value={(draft.tasks || []).join("\n")} rows={5} maxLength={5000} onChange={e => change("tasks", e.target.value.split("\n"))} /></label>
      <label className="block">Who this could suit<textarea className="block w-full rounded border p-3" value={draft.fit || ""} rows={3} maxLength={1500} onChange={e => change("fit", e.target.value)} /></label>
      <label className="block">Handover / deliverable<textarea className="block w-full rounded border p-3" value={draft.deliverable || ""} rows={3} maxLength={1500} onChange={e => change("deliverable", e.target.value)} /></label>
      <fieldset><legend>Commitments</legend>{VOLUNTEER_COMMITMENTS.map(plan => <label key={plan} className="inline-flex items-center gap-2 mr-5"><input type="checkbox" checked={draft.plans.includes(plan)} onChange={e => change("plans", e.target.checked ? [...draft.plans, plan] : draft.plans.filter(item => item !== plan))} />{plan}</label>)}</fieldset>
    </fieldset>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Role draft saved. Applications remain closed.</p>}
    <div className="flex gap-4"><button type="submit" className="rounded bg-rtg-orange-400 px-5 py-3 disabled:opacity-50" disabled={busy || !onSave}>{busy ? "Saving…" : "Save role draft"}</button>{onCancel && <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
