import { useEffect, useRef, useState } from "react";
import { dryRunOfficialImport } from "../../lib/ridge/officialImport";

export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_IDENTITY_BYTES = 128 * 1024;
const display = (value) => value == null ? "—" : String(value);
const fieldClass = "mt-1 w-full rounded-xl border border-rtg-border bg-white p-3 text-sm text-rtg-ink";

// Mount only under the existing protected admin layout. All inspection stays
// in component memory: no fetch, storage, database writes or publication.
export default function RidgeImportPreview() {
  const [csv, setCsv] = useState("");
  const [identities, setIdentities] = useState("");
  const [provenance, setProvenance] = useState({ workbookId: "", sheet: "", snapshotId: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef(null);
  const readerRef = useRef(null);
  const generation = useRef(0);

  const cancelRead = () => {
    generation.current += 1;
    if (readerRef.current?.readyState === 1) readerRef.current.abort();
    readerRef.current = null;
    setLoading(false);
  };
  useEffect(() => () => {
    generation.current += 1;
    if (readerRef.current?.readyState === 1) readerRef.current.abort();
  }, []);

  const invalidate = () => { setResult(null); setError(""); };
  const loadFile = (event) => {
    cancelRead();
    invalidate();
    const file = event.target.files?.[0];
    // Allow selecting the same file again after fixing its contents.
    event.target.value = "";
    if (!file) return;
    setCsv("");
    if (file.size > MAX_CSV_BYTES) {
      setError("CSV file exceeds the 1 MiB limit.");
      return;
    }
    const revision = generation.current;
    const reader = new FileReader();
    readerRef.current = reader;
    setLoading(true);
    reader.onload = () => {
      if (revision !== generation.current) return;
      setCsv(String(reader.result || ""));
      setLoading(false);
      readerRef.current = null;
    };
    reader.onerror = () => {
      if (revision !== generation.current) return;
      setError("Could not read this CSV file. Try again or paste the CSV text.");
      setLoading(false);
      readerRef.current = null;
    };
    reader.readAsText(file);
  };

  const run = (event) => {
    event.preventDefault();
    invalidate();
    try {
      if (!csv.trim()) throw new Error("Provide a Session Scores CSV first.");
      if (new Blob([csv]).size > MAX_CSV_BYTES) throw new Error("CSV text exceeds the 1 MiB limit.");
      if (new Blob([identities]).size > MAX_IDENTITY_BYTES) throw new Error("Identity map exceeds the 128 KiB limit.");
      let parsed;
      try { parsed = JSON.parse(identities); }
      catch { throw new Error("Identity map must be valid JSON: an array of confirmed identities."); }
      if (!Array.isArray(parsed)) throw new Error("Identity map must be a JSON array of confirmed identities.");
      setResult(dryRunOfficialImport(csv, { identities: parsed, provenance }));
    } catch (err) {
      setError(err.message || "Could not inspect this snapshot.");
    }
  };

  const clear = () => {
    cancelRead();
    setCsv(""); setIdentities("");
    setProvenance({ workbookId: "", sheet: "", snapshotId: "" });
    invalidate();
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-semibold text-rtg-orange-500">Ridge · Private inspection</p>
        <h1 className="mt-2 text-3xl font-semibold">Official scores import preview</h1>
        <p className="mt-3 font-semibold">Dry run only — no data saved or published.</p>
        <p className="mt-2 text-sm text-rtg-mist">Inspect an authorised Session Scores snapshot. Official values are preserved, not recalculated. Inputs remain in this page’s memory and are lost when you leave.</p>
      </header>
      <form onSubmit={run} className="space-y-5 rounded-2xl border border-rtg-border bg-white p-5">
        <label className="block font-medium">CSV file (maximum 1 MiB)
          <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={loadFile} className={fieldClass} />
        </label>
        <label className="block font-medium">Session Scores CSV
          <textarea value={csv} rows={7} maxLength={MAX_CSV_BYTES} spellCheck={false} className={fieldClass} onChange={(event) => { cancelRead(); invalidate(); setCsv(event.target.value); }} />
        </label>
        <label className="block font-medium">Confirmed identity map (JSON, maximum 128 KiB)
          <textarea value={identities} rows={5} maxLength={MAX_IDENTITY_BYTES} spellCheck={false} className={fieldClass} aria-describedby="identity-help" onChange={(event) => { invalidate(); setIdentities(event.target.value); }} />
        </label>
        <p id="identity-help" className="text-sm text-rtg-mist">Supply an array of objects with id, name and optional aliases array. Use confirmed stable IDs, not per-session rider IDs. No identities are prefilled or inferred.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[["workbookId", "Source workbook ID"], ["sheet", "Source sheet"], ["snapshotId", "Immutable snapshot / version ID"]].map(([key, label]) => (
            <label key={key} className="block font-medium">{label}
              <input value={provenance[key]} maxLength={500} className={fieldClass} onChange={(event) => { invalidate(); setProvenance((previous) => ({ ...previous, [key]: event.target.value })); }} />
            </label>
          ))}
        </div>
        <p className="text-sm text-rtg-mist">Provenance is user-supplied and is not independently verified by this preview.</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="rounded-xl bg-rtg-ink px-5 py-3 text-white disabled:opacity-50">Validate dry run</button>
          <button type="button" onClick={clear} className="rounded-xl border border-rtg-border px-5 py-3">Clear inputs and preview</button>
        </div>
        {loading && <p role="status">Reading local CSV…</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
      </form>
      {result && <section aria-label="Dry run results" className="space-y-4">
        <p role="status" className="rounded-xl border border-rtg-border p-4 font-semibold">{result.ready ? "Validation passed for this preview only." : "Review required: resolve errors and warnings before considering an import."} No data saved or published.</p>
        {[ ["Errors", result.errors], ["Warnings", result.warnings] ].map(([heading, issues]) => <div key={heading}>
          <h2 className="text-lg font-semibold">{heading} ({issues.length})</h2>
          {issues.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.row ? `Row ${issue.row}: ` : ""}{issue.code} — {issue.message}</li>)}</ul>}
        </div>)}
        <h2 className="text-lg font-semibold">Preserved candidate records ({result.records.length})</h2>
        <p className="text-sm text-rtg-mist">Candidates may still contain validation issues. A dash means missing, not zero. Duplicate rider/date records are excluded by validation.</p>
        <div className="overflow-x-auto rounded-xl border border-rtg-border">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <caption className="sr-only">Official score values, unchanged by this dry run</caption>
            <thead><tr>{["Session date", "Rider", "Stable ID", "L1 time", "L2 points", "L3 points", "L4 points", "L5 points", "Improvement", "Completed loops", "Highlight", "Total", "Source row"].map((label) => <th key={label} scope="col" className="border-b p-3">{label}</th>)}</tr></thead>
            <tbody>{result.records.map((record, index) => <tr key={`${record.session_date}-${record.athlete_id}-${index}`}>
              {[record.session_date, record.athlete_name, record.athlete_id || "Unresolved", record.l1_time, ...record.lap_points.slice(1), record.improvement, record.completed_laps, record.highlight_score, record.total_score, record.provenance?.sourceRow].map((value, cell) => <td key={cell} className="border-b p-3">{display(value)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
    </section>
  );
}
