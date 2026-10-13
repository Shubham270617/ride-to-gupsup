import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

// ============================================================================
// VISITORS — how many people come to the public site, how many leave
// straight away, how many are logged-in members, and who is on it right now.
//
// The numbers come from site_traffic() in the database (migration 017),
// which adds up the visits recorded by src/lib/useVisitTracker.js. A visit
// is one browser tab from arriving to leaving, and falls into one group:
//   Logged-in member   logged in at some point during the visit
//   Looked and left    not logged in, one page, gone within 30 seconds
//   Browsed            not logged in, stayed longer or opened more pages
// ============================================================================

// Each group keeps its colour everywhere on this page. The three were
// checked together for colour-blind readers; the legend, the hover box and
// the table carry the same numbers in words.
const GROUPS = [
  { key: "members", label: "Logged-in members", color: "#2a78d6" },
  { key: "left", label: "Looked and left", color: "#eb6834" },
  { key: "browsed", label: "Browsed without logging in", color: "#1baf7a" },
];
const PAGE_COLOR = "#2a78d6";
const RANGES = [7, 30, 90];
const REFRESH_MS = 30000;
const GRID_LINES = 4;

const total = (day) => GROUPS.reduce((sum, g) => sum + day[g.key], 0);
const dayLabel = (iso, options = { day: "numeric", month: "short" }) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", options);
const percent = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");

// The smallest round number (4, 8, 20, 40, 80, 200 …) the tallest bar fits
// under, so the grid lines land on whole visits.
function axisTop(max) {
  for (let step = 1; ; step *= 10) {
    const top = [1, 2, 5].map((m) => m * step * GRID_LINES).find((t) => t >= max);
    if (top) return top;
  }
}

function Tile({ label, value, note }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-rtg-mist mb-2">{label}</p>
      <p className="font-display text-4xl leading-none text-rtg-white">{value}</p>
      <p className="text-xs text-rtg-mist mt-2">{note}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {GROUPS.map((g) => (
        <span key={g.key} className="inline-flex items-center gap-2 text-xs text-rtg-mist">
          <i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: g.color }} />
          {g.label}
        </span>
      ))}
    </div>
  );
}

// One stacked bar per day. Hovering (or tabbing to) a day shows its numbers.
function DailyChart({ days }) {
  const [active, setActive] = useState(null);
  const top = axisTop(Math.max(...days.map(total), 1));
  const everyNth = Math.ceil(days.length / 5); // about five date labels, so they never collide on a phone

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between h-60 text-[10px] text-rtg-mist text-right tabular-nums">
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
            <span key={i} className="leading-none">
              {top - (top / GRID_LINES) * i}
            </span>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden="true">
            {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
              <span key={i} className="block h-px bg-rtg-border" />
            ))}
          </div>

          <div className="relative flex items-end h-60" onMouseLeave={() => setActive(null)}>
            {days.map((day, i) => {
              const parts = GROUPS.filter((g) => day[g.key] > 0);
              return (
                <button
                  key={day.day}
                  type="button"
                  className={`relative flex-1 min-w-0 h-full flex flex-col-reverse items-center gap-[2px] rounded-t-md transition-colors ${active === i ? "bg-rtg-purple-950/5" : ""}`}
                  aria-label={`${dayLabel(day.day, { weekday: "long", day: "numeric", month: "long" })}: ${GROUPS.map((g) => `${day[g.key]} ${g.label}`).join(", ")}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  {parts.map((g, n) => (
                    <span
                      key={g.key}
                      className={`block w-[70%] max-w-6 ${n === parts.length - 1 ? "rounded-t-[4px]" : ""}`}
                      style={{ height: `${(day[g.key] / top) * 100}%`, background: g.color }}
                    />
                  ))}
                </button>
              );
            })}

            {active !== null && (
              <div
                className="absolute bottom-full mb-2 z-10 w-56 rounded-xl border border-rtg-border bg-white p-3 text-left shadow-lg pointer-events-none"
                style={{ left: `clamp(0px, calc(${((active + 0.5) / days.length) * 100}% - 112px), calc(100% - 224px))` }}
              >
                <p className="text-xs font-semibold text-rtg-white mb-2">{dayLabel(days[active].day, { weekday: "short", day: "numeric", month: "short" })}</p>
                {GROUPS.map((g) => (
                  <p key={g.key} className="flex items-center gap-2 text-xs text-rtg-mist">
                    <i className="w-2 h-2 rounded-[2px]" style={{ background: g.color }} />
                    <span className="flex-1">{g.label}</span>
                    <b className="text-rtg-white tabular-nums">{days[active][g.key]}</b>
                  </p>
                ))}
                <p className="flex gap-2 text-xs text-rtg-mist mt-1.5 pt-1.5 border-t border-rtg-border">
                  <span className="flex-1">Different people</span>
                  <b className="text-rtg-white tabular-nums">{days[active].people}</b>
                </p>
              </div>
            )}
          </div>

          <div className="flex mt-2">
            {days.map((day, i) => (
              <span key={day.day} className="flex-1 min-w-0 text-center text-[10px] text-rtg-mist whitespace-nowrap overflow-visible">
                {(days.length - 1 - i) % everyNth === 0 ? dayLabel(day.day) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyTable({ days }) {
  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs uppercase tracking-wide text-rtg-mist">
            <th className="py-2 pr-4 font-semibold">Day</th>
            {GROUPS.map((g) => (
              <th key={g.key} className="py-2 pr-4 font-semibold text-right">
                {g.label}
              </th>
            ))}
            <th className="py-2 font-semibold text-right">Different people</th>
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((day) => (
            <tr key={day.day} className="border-t border-rtg-border text-rtg-white">
              <td className="py-2 pr-4">{dayLabel(day.day, { weekday: "short", day: "numeric", month: "short" })}</td>
              {GROUPS.map((g) => (
                <td key={g.key} className="py-2 pr-4 text-right tabular-nums">
                  {day[g.key]}
                </td>
              ))}
              <td className="py-2 text-right tabular-nums">{day.people}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The most opened pages, longest bar first, each with its number beside it.
function TopPages({ pages }) {
  const most = Math.max(...pages.map((p) => p.views), 1);
  return (
    <div className="space-y-3">
      {pages.map((p) => (
        <div key={p.path} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-rtg-white" title={p.path}>
            {p.path === "/" ? "Home" : p.path}
          </span>
          <span className="block h-3">
            <i className="block h-full rounded-r-[4px]" style={{ width: `${(p.views / most) * 100}%`, minWidth: 2, background: PAGE_COLOR }} />
          </span>
          <b className="text-right tabular-nums text-rtg-white">{p.views}</b>
        </div>
      ))}
    </div>
  );
}

export default function VisitorsAdmin() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [asTable, setAsTable] = useState(false);

  const load = useCallback(async () => {
    const { data: result, error: failure } = await supabase.rpc("site_traffic", { p_days: range });
    setError(failure ? failure.message : "");
    if (!failure) setData(result);
    setLoading(false);
  }, [range]);

  // Loads on arrival and when the range changes, then again every 30
  // seconds so "online now" stays current.
  useEffect(() => {
    if (!supabase) return undefined;
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const sums = useMemo(() => {
    const days = data?.days || [];
    const byGroup = Object.fromEntries(GROUPS.map((g) => [g.key, days.reduce((sum, d) => sum + d[g.key], 0)]));
    return { ...byGroup, visits: GROUPS.reduce((sum, g) => sum + byGroup[g.key], 0) };
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Visitors</h1>
          <p className="text-rtg-mist text-sm">Who comes to the site, who leaves straight away and who is logged in.</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              onClick={() => {
                setLoading(true);
                setRange(days);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${range === days ? "bg-rtg-orange-500 text-white" : "glass text-rtg-mist hover:text-rtg-white"}`}
            >
              Last {days} days
            </button>
          ))}
          <button type="button" onClick={load} aria-label="Refresh" className="glass rounded-full p-2 text-rtg-mist hover:text-rtg-white transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="glass rounded-2xl p-5 text-sm text-rtg-white mb-6">
          The visitor numbers could not be loaded. If this is the first time, run <b>supabase/migrations/017_site_visits.sql</b> in the Supabase SQL Editor.
          <span className="block text-xs text-rtg-mist mt-1">{error}</span>
        </p>
      )}

      {data && (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Tile label="Online now" value={data.online} note={`${data.online_members} logged in · seen in the last 2 minutes`} />
            <Tile label="People" value={data.people} note={`different browsers in the last ${range} days`} />
            <Tile label="Logged-in members" value={data.members} note={`${sums.members} of ${sums.visits} visits were by a member`} />
            <Tile label="Looked and left" value={percent(sums.left, sums.visits)} note={`${sums.left} of ${sums.visits} visits ended within 30 seconds`} />
          </div>

          <div className="glass rounded-2xl p-5 md:p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display text-2xl leading-none mb-2">Visits per day</h2>
                <Legend />
              </div>
              <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-semibold text-rtg-orange-500 hover:text-rtg-orange-600 transition-colors">
                {asTable ? "Show as graph" : "Show as table"}
              </button>
            </div>
            {sums.visits === 0 ? (
              <p className="text-sm text-rtg-mist py-10 text-center">No visits recorded in this period yet.</p>
            ) : asTable ? (
              <DailyTable days={data.days} />
            ) : (
              <DailyChart days={data.days} />
            )}
          </div>

          <div className="glass rounded-2xl p-5 md:p-6">
            <h2 className="font-display text-2xl leading-none mb-1.5">Most opened pages</h2>
            <p className="text-xs text-rtg-mist mb-5">Times each page was opened in the last {range} days.</p>
            {data.pages.length === 0 ? <p className="text-sm text-rtg-mist py-6 text-center">No pages opened in this period yet.</p> : <TopPages pages={data.pages} />}
          </div>
        </>
      )}

      {!data && !error && (
        <div className="py-20 grid place-items-center">
          <Loader2 className="animate-spin text-rtg-orange-400" size={26} />
        </div>
      )}
    </div>
  );
}
