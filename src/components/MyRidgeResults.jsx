import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mountain, ArrowUpRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { formatDuration } from "../lib/ridge/engine";

// Dashboard: the member's own Ridge Repeats results, from Live sessions where
// an admin linked a Ridge rider to this account (Admin -> Ridge — Session
// control -> Riders -> Link member). Read through my_ridge_results(), which
// only ever returns the signed-in member's rows (migration 034). Shows
// nothing at all for members who have never ridden.
export function useMyRidgeResults(userId, client = supabase) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setRows([]);
      return undefined;
    }
    let cancelled = false;
    // Any failure (e.g. migration 034 not run yet) just hides the section.
    Promise.resolve()
      .then(() => client.rpc("my_ridge_results"))
      .then(({ data, error }) => {
        if (!cancelled) setRows(!error && Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, client]);
  return rows;
}

const niceDate = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
const points = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "—");

export default function MyRidgeResults({ rows }) {
  if (!rows?.length) return null;
  const best = Math.max(...rows.map((r) => Number(r.total_score) || 0));
  return (
    <section data-text-section="ridge-results">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="dash-title !mb-0">My Ridge Repeats</h2>
        <span className="text-xs font-semibold text-rtg-mist">
          {rows.length} session{rows.length === 1 ? "" : "s"} · best {points(best)} pts
        </span>
        <Link to="/lab/ridge" className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-rtg-orange-500 transition-colors hover:text-rtg-orange-600">
          Open Ridge Repeats <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="dash-list">
        {rows.map((r) => (
          <article key={r.id} className="dash-row">
            <span className="dash-row-icon">
              <Mountain size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {niceDate(r.session_date)}
                {r.session_label ? ` · ${r.session_label}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-rtg-mist">
                {r.completed_laps} lap{r.completed_laps === 1 ? "" : "s"}
                {r.total_ms > 0 ? ` · riding ${formatDuration(r.total_ms)}` : ""}
                {r.break_ms > 0 ? ` · breaks ${formatDuration(r.break_ms)}` : ""}
                {r.finished ? " · finished" : ""}
              </p>
            </div>
            <span className="shrink-0 font-display text-xl text-rtg-purple-600">{points(r.total_score)} pts</span>
          </article>
        ))}
      </div>
    </section>
  );
}
