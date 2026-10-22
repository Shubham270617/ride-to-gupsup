import { useEffect, useMemo, useRef, useState } from "react";
import { volunteerRoles } from "../../lib/volunteerRoles";
import { createVolunteerRepository } from "../../lib/volunteerRepository";
import { supabase } from "../../lib/supabaseClient";
import VolunteerRoleEditor from "../../components/volunteer/VolunteerRoleEditor";

// Mount under existing ProtectedRoute/AdminLayout. Opt in only after the
// reviewed test schema and RLS are applied and verified. Default is inspection.
export default function VolunteerAdmin({ persistenceEnabled = false, client = supabase }) {
  const repository = useMemo(() => createVolunteerRepository(client), [client]);
  const [roles, setRoles] = useState(persistenceEnabled ? [] : volunteerRoles);
  const [selectedId, setSelectedId] = useState(volunteerRoles[0].id);
  const [loading, setLoading] = useState(persistenceEnabled);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [referenceId, setReferenceId] = useState(volunteerRoles[0].id);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createNotice, setCreateNotice] = useState("");
  const creatingRef = useRef(false);
  useEffect(() => {
    if (!persistenceEnabled) return;
    let active = true;
    setLoading(true); setError("");
    repository.listDrafts().then(rows => {
      if (!active) return;
      setRoles(rows); setSelectedId(current => rows.some(row => row.id === current) ? current : rows[0]?.id || "");
    }).catch(() => { if (active) setError("Role drafts could not be loaded. Verify test database setup and admin access."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [persistenceEnabled, repository, attempt]);
  const selected = roles.find(role => role.id === selectedId);
  const references = volunteerRoles.filter(role => !roles.some(draft => draft.id === role.id));
  const reference = references.find(role => role.id === referenceId) || references[0];
  async function createFromReference() {
    if (!persistenceEnabled || !reference || creatingRef.current || saving || dirty) return;
    creatingRef.current = true; setCreating(true); setCreateError(""); setCreateNotice("");
    try {
      const stored = await repository.createDraft(reference);
      if (stored.id !== reference.id || !Number.isSafeInteger(stored.version) || stored.version < 1) throw new Error("Creation was not confirmed.");
      setRoles(current => [...current.filter(role => role.id !== stored.id), stored]);
      setSelectedId(stored.id); setPendingId(""); setDirty(false);
      setCreateNotice("Role draft created. Nothing was published and applications remain closed.");
    } catch {
      setCreateError("Role draft could not be created. It may already exist or your admin access may have changed. No creation was confirmed; reload the drafts before retrying if another admin may have created it.");
    } finally { creatingRef.current = false; setCreating(false); }
  }
  async function save(role) {
    const stored = await repository.saveDraft(role);
    setRoles(current => current.map(item => item.id === stored.id ? stored : item));
    return stored;
  }
  return <section className="space-y-6" aria-labelledby="volunteer-admin-title">
    <header><h1 id="volunteer-admin-title" className="font-display text-3xl">RTG Crew roles</h1><p className="text-rtg-mist mt-2">Prepare role content. Applications remain closed; saving a draft does not publish it.</p></header>
    {!persistenceEnabled && <p role="note" className="rounded border border-amber-400/40 p-4">Reference preview only. Database saving is disabled until the test project schema and admin permissions are verified.</p>}
    {loading ? <p role="status">Loading role drafts…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : <>
      {persistenceEnabled && <section className="rounded border p-4 space-y-3" aria-labelledby="volunteer-create-title">
        <h2 id="volunteer-create-title" className="font-display text-xl">Create a role draft</h2>
        <p className="text-sm text-rtg-mist">Choose one proposed role from the reference catalogue. This creates an editable private draft, not an approved programme offer. It does not publish the role, open applications or approve any payment.</p>
        {references.length ? <><label className="block">Reference role<select className="block w-full rounded border p-3 mt-2" value={reference.id} disabled={creating || saving || dirty} onChange={event => { setReferenceId(event.target.value); setCreateError(""); setCreateNotice(""); }}>{references.map(role => <option key={role.id} value={role.id}>{role.title}</option>)}</select></label>
          <button type="button" className="rounded bg-rtg-orange-400 px-5 py-3 disabled:opacity-50" disabled={creating || saving || dirty} onClick={createFromReference}>{creating ? "Creating draft…" : "Create draft from reference"}</button>
          {dirty && <p>Save your current edits, or discard them by switching roles, before creating another draft.</p>}</> : <p>Every reference role already has a draft. Choose an existing role below to edit it.</p>}
        {createError && <div role="alert"><p>{createError}</p><button type="button" disabled={saving || creating || dirty} onClick={() => { setCreateError(""); setAttempt(value => value + 1); }}>Reload drafts</button></div>}
        {createNotice && <p role="status">{createNotice}</p>}
      </section>}
      {roles.length ? <><label className="block">Choose role<select disabled={saving || creating} className="block w-full rounded border p-3 mt-2" value={selectedId} onChange={event => { setCreateNotice(""); if (dirty) setPendingId(event.target.value); else setSelectedId(event.target.value); }}>{roles.map(role => <option key={role.id} value={role.id}>{role.title}</option>)}</select></label>
        {pendingId && <div role="alert" className="rounded border p-4"><p>You have unsaved changes. Keep editing or discard them before switching roles.</p><button type="button" onClick={() => setPendingId("")}>Keep editing</button><button type="button" className="ml-4" onClick={() => { setSelectedId(pendingId); setPendingId(""); setDirty(false); }}>Discard changes and switch</button></div>}
        {selected && <fieldset disabled={creating}><VolunteerRoleEditor key={selected.id} role={selected} onSave={persistenceEnabled ? save : undefined} onDirtyChange={value => { setDirty(value); setCreateNotice(""); }} onBusyChange={setSaving} /></fieldset>}</> : <p>No role drafts exist yet. Choose a proposed reference role above to create the first private draft.</p>}
    </>}
  </section>;
}
