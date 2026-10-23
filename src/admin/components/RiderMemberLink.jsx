import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Admin -> Ridge — Session control -> Riders: join a Ridge rider to their RTG
// member account (or undo it). A linked member sees their published Ridge
// results on their own dashboard. Search reads profiles, which admins can see.
export default function RiderMemberLink({ rider, busy, onSave, client = supabase }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    // Commas and brackets have meaning in the filter syntax; drop them.
    const q = query.replace(/[,()%*\\]/g, " ").trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: err } = await client
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      if (cancelled) return;
      setError(err ? "Couldn't search members." : "");
      setResults(data || []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, client]);

  if (rider.profileId && !open)
    return (
      <span className="ra-member">
        <span title="Linked RTG member">👤 {rider.memberName || "Linked member"}</span>
        <button type="button" disabled={busy} onClick={() => onSave(null, "")}>Unlink</button>
      </span>
    );
  if (!open)
    return (
      <button type="button" disabled={busy} onClick={() => setOpen(true)}>
        Link member
      </button>
    );
  return (
    <div className="ra-member-search">
      <input
        autoFocus
        aria-label={`Find the RTG member for ${rider.name}`}
        placeholder="Member name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <ul>
        {results.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const name = m.full_name || m.email || "Member";
                if (await onSave(m.id, name)) setOpen(false);
              }}
            >
              {m.full_name || "—"} <small>{m.email}</small>
            </button>
          </li>
        ))}
        {query.trim().length >= 2 && !results.length && !error && <li><small>No member found.</small></li>}
      </ul>
      <button type="button" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
