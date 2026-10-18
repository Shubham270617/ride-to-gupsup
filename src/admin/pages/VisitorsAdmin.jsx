import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Users, UserCheck, LogOut, Eye, Radio, ArrowUpRight, ArrowDownRight, Minus, AreaChart, BarChart3, Table2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { GROUPS, dayLabel, percentChange, splitPeriods, sumGroups, visitsOn, weekdayAverages } from "../visitorStats";
import { Legend, Sparkline, StackedArea, StackedBars, TopPages, VisitDonut, WeekdayBars } from "../components/VisitorCharts";

// ============================================================================
// VISITORS — how many people come to the public site, how many leave
// straight away, how many are logged-in members, and who is on it right now.
//
// Numbers come from site_traffic() (migration 017), which adds up the visits
// recorded by src/lib/useVisitTracker.js. A visit is one browser tab from
// arriving to leaving, and falls into one group:
//   Logged-in member   logged in at some point during the visit
//   Looked and left    not logged in, one page, gone within 30 seconds
//   Browsed            not logged in, stayed longer or opened more pages
//
// Two calls per refresh: twice the range (so every tile can compare with the
// period before) and the range itself (people, members and top pages for
// exactly the period on screen).
// ============================================================================

const RANGES = [7, 30, 90];
const REFRESH_MS = 30000;
const VIEWS = [
  { key: "area", label: "Area", icon: AreaChart },
  { key: "bars", label: "Bars", icon: BarChart3 },
  { key: "table", label: "Table", icon: Table2 },
];

// "↑ 12% vs previous 30 days". For "looked and left", going up is bad, so
// the arrow carries the direction and the words carry the meaning — no
// red/green judgement colours.
function Delta({ now, before, range, suffix = "" }) {
  const change = percentChange(now, before);
  if (change === null) return <span className="text-[11px] text-rtg-mist">new this period</span>;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-rtg-mist">
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rtg-purple-950/[0.06] px-1.5 py-0.5 font-semibold tabular-nums text-rtg-white">
        <Icon size={12} />
        {Math.abs(change)}%{suffix}
      </span>
      vs previous {range} days
    </span>
  );
}

function StatTile({ icon: Icon, label, value, children, spark, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-rtg-border bg-white p-5 shadow-[0_20px_50px_-35px_rgba(53,36,111,0.45)] transition-transform hover:-translate-y-0.5">
      <span aria-hidden="true" className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-[0.08]" style={{ background: accent }} />
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-2xl text-white" style={{ background: accent }}>
          <Icon size={18} />
        </span>
        {spark}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">{label}</p>
      <p className="mt-1 font-display text-4xl leading-none text-rtg-white tabular-nums">{value}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-rtg-border bg-white p-5 shadow-[0_20px_50px_-35px_rgba(53,36,111,0.45)] md:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-none">{title}</h2>
          {subtitle && <div className="mt-2 text-xs text-rtg-mist">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DailyTable({ days }) {
  return (
    <div className="max-h-80 overflow-x-auto overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs uppercase tracking-wide text-rtg-mist">
            <th className="py-2 pr-4 font-semibold">Day</th>
            {GROUPS.map((g) => (
              <th key={g.key} className="py-2 pr-4 text-right font-semibold">
                {g.label}
              </th>
            ))}
            <th className="py-2 pr-4 text-right font-semibold">All visits</th>
            <th className="py-2 text-right font-semibold">Different people</th>
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
              <td className="py-2 pr-4 text-right font-semibold tabular-nums">{visitsOn(day)}</td>
              <td className="py-2 text-right tabular-nums">{day.people}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VisitorsAdmin() {
  const [range, setRange] = useState(30);
  const [wide, setWide] = useState(null); // 2 × range, for comparisons
  const [data, setData] = useState(null); // exactly the range
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("area");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    const [both, exact] = await Promise.all([
      supabase.rpc("site_traffic", { p_days: Math.min(range * 2, 365) }),
      supabase.rpc("site_traffic", { p_days: range }),
    ]);
    const failure = both.error || exact.error;
    setError(failure ? failure.message : "");
    if (!failure) {
      setWide(both.data);
      setData(exact.data);
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, [range]);

  // On arrival, on a range change, then every 30 seconds so "online now"
  // stays current.
  useEffect(() => {
    if (!supabase) return undefined;
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const stats = useMemo(() => {
    if (!wide || !data) return null;
    const { current, previous } = splitPeriods(wide.days || [], range);
    const now = sumGroups(current);
    const before = sumGroups(previous);
    const leftShare = now.visits ? Math.round((now.left / now.visits) * 100) : 0;
    const leftShareBefore = before.visits ? Math.round((before.left / before.visits) * 100) : 0;
    return {
      days: current,
      now,
      before,
      leftShare,
      leftShareBefore,
      dailyVisits: current.map(visitsOn),
      dailyPeople: current.map((d) => d.people),
      dailyMembers: current.map((d) => d.members),
      weekdays: weekdayAverages(current),
    };
  }, [wide, data, range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1b1130_0%,#35246f_60%,#5e43a1_100%)] p-6 text-white md:p-8">
        <span aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_50px_rgba(255,255,255,0.03),0_0_0_110px_rgba(255,255,255,0.02)]" />
        <span aria-hidden="true" className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-rtg-orange-500/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">Audience</p>
            <h1 className="mt-1 font-display text-5xl leading-none">Visitors</h1>
            <p className="mt-2 max-w-md text-sm text-white/70">Who comes to the site, who leaves straight away, who's logged in — and who's on it right now.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/10 p-1 backdrop-blur">
              {RANGES.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => {
                    setLoading(true);
                    setRange(days);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${range === days ? "bg-white text-rtg-purple-950" : "text-white/75 hover:text-white"}`}
                >
                  {days} days
                </button>
              ))}
            </div>
            <button type="button" onClick={load} aria-label="Refresh" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 backdrop-blur transition-colors hover:text-white">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="relative mt-4 text-[11px] text-white/50">
            Updates every 30 seconds · last {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-rtg-border bg-white p-5 text-sm text-rtg-white">
          The visitor numbers could not be loaded. If this is the first time, run <b>supabase/migrations/017_site_visits.sql</b> in the Supabase SQL Editor.
          <span className="mt-1 block text-xs text-rtg-mist">{error}</span>
        </p>
      )}

      {stats && data && (
        <>
          {/* Tiles */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={Radio} label="Online now" value={data.online} accent="linear-gradient(135deg,#0f9d6b,#1baf7a)" spark={
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            }>
              <span className="text-[11px] text-rtg-mist">
                <b className="text-rtg-white">{data.online_members}</b> logged in · <b className="text-rtg-white">{Math.max(0, data.online - data.online_members)}</b> guests · last 2 min
              </span>
            </StatTile>
            <StatTile icon={Eye} label="Visits" value={stats.now.visits} accent="linear-gradient(135deg,#35246f,#5e43a1)" spark={<Sparkline values={stats.dailyVisits} />}>
              <Delta now={stats.now.visits} before={stats.before.visits} range={range} />
            </StatTile>
            <StatTile icon={UserCheck} label="Member visits" value={stats.now.members} accent="linear-gradient(135deg,#1d5fb0,#2a78d6)" spark={<Sparkline values={stats.dailyMembers} color="#2a78d6" />}>
              <span className="text-[11px] text-rtg-mist">
                <b className="text-rtg-white">{data.members}</b> different members · <Delta now={stats.now.members} before={stats.before.members} range={range} />
              </span>
            </StatTile>
            <StatTile icon={LogOut} label="Looked and left" value={`${stats.leftShare}%`} accent="linear-gradient(135deg,#d94f0e,#eb6834)">
              <span className="block text-[11px] text-rtg-mist">
                {stats.now.left} of {stats.now.visits} visits ended within 30 s · was {stats.leftShareBefore}%
              </span>
            </StatTile>
          </div>

          {/* Main chart */}
          <Panel
            title="Visits per day"
            subtitle={<Legend sums={stats.now} />}
            action={
              <div className="flex rounded-full bg-rtg-purple-950/[0.05] p-1">
                {VIEWS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    aria-pressed={view === v.key}
                    onClick={() => setView(v.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === v.key ? "bg-white text-rtg-white shadow-sm" : "text-rtg-mist hover:text-rtg-white"}`}
                  >
                    <v.icon size={13} /> {v.label}
                  </button>
                ))}
              </div>
            }
          >
            {stats.now.visits === 0 ? (
              <p className="py-14 text-center text-sm text-rtg-mist">No visits recorded in this period yet.</p>
            ) : view === "table" ? (
              <DailyTable days={stats.days} />
            ) : view === "bars" ? (
              <StackedBars days={stats.days} />
            ) : (
              <StackedArea days={stats.days} />
            )}
          </Panel>

          {/* Mix + weekday rhythm */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Visit mix" subtitle={`What the ${stats.now.visits} visits in the last ${range} days were`}>
              {stats.now.visits === 0 ? <p className="py-10 text-center text-sm text-rtg-mist">Nothing to show yet.</p> : <VisitDonut sums={stats.now} />}
            </Panel>
            <Panel title="Weekly rhythm" subtitle="Average visits on each day of the week — the busiest day is highlighted">
              {stats.now.visits === 0 ? <p className="py-10 text-center text-sm text-rtg-mist">Nothing to show yet.</p> : <WeekdayBars weekdays={stats.weekdays} />}
            </Panel>
          </div>

          {/* Pages + people */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel title="Most opened pages" subtitle={`Times each page was opened in the last ${range} days`}>
              {data.pages.length === 0 ? <p className="py-6 text-center text-sm text-rtg-mist">No pages opened in this period yet.</p> : <TopPages pages={data.pages} />}
            </Panel>
            <Panel title="People" subtitle="Different browsers, not visits — one person visiting five times counts once">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-rtg-purple-950/[0.04] p-4">
                  <Users size={18} className="text-rtg-mist" />
                  <p className="mt-3 font-display text-4xl leading-none tabular-nums">{data.people}</p>
                  <p className="mt-1 text-xs text-rtg-mist">people in {range} days</p>
                </div>
                <div className="rounded-2xl bg-rtg-purple-950/[0.04] p-4">
                  <UserCheck size={18} className="text-rtg-mist" />
                  <p className="mt-3 font-display text-4xl leading-none tabular-nums">{data.members}</p>
                  <p className="mt-1 text-xs text-rtg-mist">of them logged in</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">Different people per day</p>
                <Sparkline values={stats.dailyPeople} width={320} height={56} />
              </div>
            </Panel>
          </div>
        </>
      )}

      {!data && !error && (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-rtg-orange-400" size={26} />
        </div>
      )}
    </div>
  );
}
