import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ChevronDown, RotateCcw } from "lucide-react";
import Reveal from "../components/ui/Reveal";
import {
  useLeaderboardChallenges,
  useLeaderboardSports,
  useLeaderboardAgeGroups,
  useLeaderboardEntries,
  useRidgeSessions,
  useRidgeResults,
  useSiteSettings,
  buildLeaderboardPageCopy,
} from "../lib/publicData";

// ============================================================================
// LEADERBOARD PAGE — a data-first "performance matrix": a filter console,
// four totals, the top three, a momentum chart, sport / age breakdowns, the
// full ranking table, and the separate Ridge Repeats board.
//
// Nothing here is written in code:
//   leaderboard_entries     (Admin -> Leaderboard — Athletes)     the rows
//   leaderboard_challenges  (Admin -> Leaderboard — Challenges)   the dropdown
//   leaderboard_sports      (Admin -> Leaderboard — Sports)       pills, colours
//   leaderboard_age_groups  (Admin -> Leaderboard — Age Groups)   pills, bars
//   ridge_sessions / ridge_results (Admin -> Ridge Repeats — …)   Ridge board
//   "text.leaderboard.<field>" (Admin -> Site Content -> Leaderboard) wording
// Every total, rank, chart and sentence is worked out from those rows.
// Layout and motion are in index.css under "LEADERBOARD PAGE" (.rtg-lb-*).
// ============================================================================

const ALL = "all";
const PODIUM_SIZE = 3;
const MOMENTUM_ATHLETES = 5; // the Momentum chart averages the top few rows
const NO_FILTERS = { challenge: ALL, gender: ALL, age: ALL, sport: ALL, search: "" };

// What the board can be ranked by; `label` / `unit` are fields of the copy.
const METRICS = [
  { key: "points", label: "pointsLabel", unit: "pointsUnit", value: (row) => row.points, show: (n) => formatNumber(n) },
  { key: "distance", label: "distanceLabel", unit: "distanceUnit", value: (row) => row.distance, show: (n) => formatNumber(n) },
  { key: "sessions", label: "sessionsLabel", unit: "sessionsLabel", value: (row) => row.sessions, show: (n) => formatNumber(n) },
  { key: "consistency", label: "consistencyLabel", unit: "consistencyLabel", value: (row) => row.consistency, show: (n) => `${n}%` },
];

const formatNumber = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const pad2 = (n) => String(n).padStart(2, "0");
const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);
const average = (list, pick) => (list.length ? sum(list, pick) / list.length : 0);
const splitList = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);
// "Hello {name}" + { name: "RTG" } -> "Hello RTG"
const fill = (template, values) => (template || "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
const clock = (seconds) => {
  const whole = Math.round(seconds);
  return `${pad2(Math.floor(whole / 60))}:${pad2(whole % 60)}`;
};
const signed = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

// Values -> points spread across a box, the highest value at the top.
function plot(values, { width, height, left, top }) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const range = Math.max(1, Math.max(...values) - min);
  return values.map((value, i) => ({
    x: left + (values.length === 1 ? width / 2 : (i * width) / (values.length - 1)),
    y: top + height - ((value - min) / range) * height,
  }));
}
const linePath = (points) => points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

// ----------------------------------------------------------------------------
// BACKDROP — fixed to the viewport: soft colour washes, two big rings,
// drifting sports line-art, dashed routes and three pulsing dots.
// ----------------------------------------------------------------------------
function LeaderboardBackdrop() {
  return (
    <div className="rtg-lb-bg" aria-hidden="true">
      <svg className="rtg-lb-bg-bike" viewBox="0 0 240 150">
        <circle cx="52" cy="104" r="32" />
        <circle cx="187" cy="104" r="32" />
        <path d="M52 104 93 46h34l60 58M93 46l31 58M82 72h76M110 28h39" />
        <path d="M124 104 143 70" />
      </svg>

      <svg className="rtg-lb-bg-runner" viewBox="0 0 150 150">
        <circle cx="92" cy="22" r="9" />
        <path d="M83 37 65 55l13 20 19-13 12 17" />
        <path d="M66 55 44 61 26 51" />
        <path d="M78 75 58 99 34 120" />
        <path d="M80 76 99 99l25 10" />
        <path d="M99 99 121 128" />
        <path d="M58 99 50 131" />
      </svg>

      <svg className="rtg-lb-bg-trophy" viewBox="0 0 150 160">
        <path d="M47 23h56v31c0 24-12 39-28 39S47 78 47 54Z" />
        <path d="M47 34H23v14c0 17 10 27 28 27M103 34h24v14c0 17-10 27-28 27" />
        <path d="M75 93v22M52 136h46M61 115h28v21" />
      </svg>

      <svg className="rtg-lb-bg-chart" viewBox="0 0 180 120">
        <path d="M20 101V16M20 101h142" />
        <path d="M37 88 68 65 93 73 121 43 153 28" />
        <circle cx="37" cy="88" r="4" />
        <circle cx="68" cy="65" r="4" />
        <circle cx="93" cy="73" r="4" />
        <circle cx="121" cy="43" r="4" />
        <circle cx="153" cy="28" r="4" />
      </svg>

      <svg className="rtg-lb-bg-watch" viewBox="0 0 140 140">
        <circle cx="70" cy="78" r="39" />
        <path d="M70 39V23M55 19h30M96 47l10-10" />
        <path d="M70 78 88 63" />
        <circle cx="70" cy="78" r="4" />
      </svg>

      <svg className="rtg-lb-bg-routes" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path className="rtg-lb-route-a" d="M-60 170C130 72 270 258 438 162C600 70 735 265 898 158C1040 65 1182 194 1490 70" />
        <path className="rtg-lb-route-b" d="M-90 742C120 620 270 805 455 688C638 584 808 754 982 646C1140 550 1265 670 1490 552" />
      </svg>

      <span className="rtg-lb-pulse rtg-lb-pulse-a" />
      <span className="rtg-lb-pulse rtg-lb-pulse-b" />
      <span className="rtg-lb-pulse rtg-lb-pulse-c" />
    </div>
  );
}

// One row of filter pills: "all" first, then one pill per option.
function FilterGroup({ tone, label, allLabel, options, value, onChange }) {
  return (
    <div className={`rtg-lb-filter rtg-lb-filter-${tone}`}>
      <span>{label}</span>
      {[{ value: ALL, label: allLabel }, ...options].map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "active" : undefined}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// FILTER CONSOLE — challenge, rank-by and search on top; gender, age and
// sport pills below; a one-line summary of what's picked, and Reset.
// ----------------------------------------------------------------------------
function FilterConsole({ copy, filters, setFilter, metric, setMetric, challenges, genders, ageGroups, sports, summary, onReset, onJump }) {
  return (
    <Reveal as={motion.section} className="rtg-lb-console">
      <div className="rtg-lb-console-top">
        <div className="rtg-lb-field">
          <label htmlFor="rtg-lb-challenge">01 • {copy.challengeLabel}</label>
          <div className="rtg-lb-select">
            <select id="rtg-lb-challenge" value={filters.challenge} onChange={(e) => setFilter("challenge", e.target.value)}>
              <option value={ALL}>{copy.allChallengesLabel}</option>
              {challenges.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
        </div>

        <div className="rtg-lb-field">
          <label htmlFor="rtg-lb-metric">02 • {copy.rankLabel}</label>
          <div className="rtg-lb-select">
            <select id="rtg-lb-metric" value={metric.key} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {copy[m.label]}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
        </div>

        <div className="rtg-lb-field rtg-lb-search">
          <label htmlFor="rtg-lb-search">03 • {copy.searchLabel}</label>
          <input
            id="rtg-lb-search"
            type="search"
            placeholder={copy.searchPlaceholder}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>

        <button className="rtg-lb-jump" type="button" onClick={onJump}>
          <span>{copy.ridgeJumpKicker}</span>
          <strong>{copy.ridgeJumpTitle}</strong>
          <ArrowDown size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="rtg-lb-filters">
        <FilterGroup
          tone="gender"
          label={copy.genderLabel}
          allLabel={copy.allLabel}
          options={genders.map((g) => ({ value: g, label: g }))}
          value={filters.gender}
          onChange={(v) => setFilter("gender", v)}
        />
        <FilterGroup
          tone="age"
          label={copy.ageLabel}
          allLabel={copy.allLabel}
          options={ageGroups.map((a) => ({ value: a.slug, label: a.filterLabel }))}
          value={filters.age}
          onChange={(v) => setFilter("age", v)}
        />
        <FilterGroup
          tone="sport"
          label={copy.sportLabel}
          allLabel={copy.allLabel}
          options={sports.map((s) => ({ value: s.slug, label: s.filterLabel }))}
          value={filters.sport}
          onChange={(v) => setFilter("sport", v)}
        />
      </div>

      <div className="rtg-lb-summary">
        <span>{summary}</span>
        <button type="button" onClick={onReset}>
          {copy.resetLabel} <RotateCcw size={11} aria-hidden="true" />
        </button>
      </div>
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// MOMENTUM — the average checkpoint score of the top few athletes in view.
// ----------------------------------------------------------------------------
const MOMENTUM_BOX = { width: 672, height: 205, left: 28, top: 24 };
const MOMENTUM_BASE = 253;

function MomentumChart({ copy, rows }) {
  const checkpoints = useMemo(() => {
    const source = rows.slice(0, MOMENTUM_ATHLETES).filter((row) => row.trend.length);
    const count = Math.max(0, ...source.map((row) => row.trend.length));
    return Array.from({ length: count }, (_, i) => average(source.filter((row) => i < row.trend.length), (row) => row.trend[i]));
  }, [rows]);

  const points = plot(checkpoints, MOMENTUM_BOX);
  const line = linePath(points);
  const area = points.length ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${MOMENTUM_BASE} L ${points[0].x.toFixed(1)} ${MOMENTUM_BASE} Z` : "";

  return (
    <Reveal className="rtg-lb-panel rtg-lb-chart-panel" delay={0.06}>
      <div className="rtg-lb-panel-head">
        <div>
          <span>{copy.chartKicker}</span>
          <h2 className="font-display">{copy.chartTitle}</h2>
        </div>
        {checkpoints.length > 0 && <div className="rtg-lb-chip">{fill(copy.chartChip, { count: checkpoints.length })}</div>}
      </div>

      <div className="rtg-lb-line-chart">
        <svg viewBox="0 0 720 285" preserveAspectRatio="none" role="img" aria-label={copy.chartTitle}>
          <defs>
            <linearGradient id="rtg-lb-line-grad" x1="0" x2="1">
              <stop offset="0%" stopColor="#17c9ff" />
              <stop offset="45%" stopColor="#6568ff" />
              <stop offset="100%" stopColor="#ff4fa3" />
            </linearGradient>
            <linearGradient id="rtg-lb-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6568ff" stopOpacity=".22" />
              <stop offset="100%" stopColor="#6568ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="rtg-lb-grid">
            {[36, 96, 156, 216].map((y) => (
              <line key={y} x1="28" y1={y} x2="700" y2={y} />
            ))}
          </g>
          <path className="rtg-lb-area" d={area} />
          <path className="rtg-lb-line" d={line} />
          {points.map((p, i) => (
            <circle key={i} className="rtg-lb-dot" cx={p.x} cy={p.y} r="5" />
          ))}
        </svg>
        <div className="rtg-lb-axis">
          {checkpoints.map((_, i) => (
            <span key={i}>
              {copy.checkpointPrefix}
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function Sparkline({ trend }) {
  const d = linePath(plot(trend, { width: 72, height: 20, left: 4, top: 4 }));
  if (!d) return null;
  return (
    <svg className="rtg-lb-spark" viewBox="0 0 80 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// RIDGE REPEATS — its own board, untouched by the filters above. A rider's
// average loop, improvement and completion come from their loop times.
// ----------------------------------------------------------------------------
const RIDGE_BOX = { width: 640, height: 185, left: 40, top: 45 };

function RidgeLab({ copy, sessions, results, sectionRef }) {
  const [sessionSlug, setSessionSlug] = useState(null);
  const [riderId, setRiderId] = useState(null);
  const session = sessions.find((s) => s.slug === sessionSlug) || sessions[0] || null;

  const riders = useMemo(() => {
    if (!session) return [];
    return results
      .filter((r) => r.session === session.slug)
      .map((r) => {
        const first = r.loops[0];
        const last = r.loops[r.loops.length - 1];
        return {
          ...r,
          avg: average(r.loops, (s) => s),
          improvement: r.improvement ?? (r.loops.length > 1 ? ((first - last) / first) * 100 : 0),
          completion: session.loopCount ? Math.min(100, Math.round((r.loops.length / session.loopCount) * 100)) : 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [results, session]);

  const rider = riders.find((r) => r.id === riderId) || riders[0] || null;
  // Faster loops sit higher on the chart, so the times are flipped.
  const points = rider ? plot(rider.loops.map((s) => -s), RIDGE_BOX) : [];
  const line = linePath(points);
  const timed = riders.filter((r) => r.loops.length);

  const kpis = [
    { label: copy.ridgeBestLabel, value: signed(riders.length ? Math.max(...riders.map((r) => r.improvement)) : 0) },
    { label: copy.ridgeAvgLabel, value: clock(average(timed, (r) => r.avg)) },
    { label: copy.ridgeCompletionLabel, value: `${Math.round(average(riders, (r) => r.completion))}%` },
    { label: copy.ridgeTopScoreLabel, value: (riders.length ? Math.max(...riders.map((r) => r.score)) : 0).toFixed(2) },
  ];

  return (
    <section className="rtg-lb-ridge" id="ridge-repeats" ref={sectionRef}>
      <Reveal amount={0.08}>
        <div className="rtg-lb-ridge-top">
          <div className="rtg-lb-ridge-title">
            <span>{copy.ridgeKicker}</span>
            <h2>
              {copy.ridgeTitle} <b>{copy.ridgeTitleAccent}</b>
            </h2>
            <p>{copy.ridgeText}</p>
          </div>

          {sessions.length > 0 && (
            <div className="rtg-lb-ridge-session">
              <label htmlFor="rtg-lb-ridge-session">{copy.ridgeSessionLabel}</label>
              <select
                id="rtg-lb-ridge-session"
                value={session.slug}
                onChange={(e) => {
                  setSessionSlug(e.target.value);
                  setRiderId(null);
                }}
              >
                {sessions.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="rtg-lb-ridge-kpis">
          {kpis.map((kpi) => (
            <article key={kpi.label}>
              <span>{kpi.label}</span>
              <strong className="font-display">{kpi.value}</strong>
            </article>
          ))}
        </div>

        <div className="rtg-lb-ridge-grid">
          <div className="rtg-lb-ridge-card">
            <div className="rtg-lb-mini-head rtg-lb-mini-head-ridge">
              <span>{copy.ridgeChartKicker}</span>
              <strong>{rider ? rider.name : "—"}</strong>
            </div>

            <svg viewBox="0 0 720 300" preserveAspectRatio="none" role="img" aria-label={copy.ridgeChartKicker}>
              <g className="rtg-lb-grid rtg-lb-grid-ridge">
                {[50, 110, 170, 230].map((y) => (
                  <line key={y} x1="30" y1={y} x2="700" y2={y} />
                ))}
              </g>
              <path className="rtg-lb-line rtg-lb-line-ridge" d={line} />
              {points.map((p, i) => (
                <g key={i}>
                  <circle className="rtg-lb-dot rtg-lb-dot-ridge" cx={p.x} cy={p.y} r="6" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle">
                    {clock(rider.loops[i])}
                  </text>
                </g>
              ))}
            </svg>

            <div className="rtg-lb-axis rtg-lb-axis-ridge">
              {points.map((_, i) => (
                <span key={i}>
                  {copy.loopPrefix}
                  {i + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="rtg-lb-ridge-card">
            <div className="rtg-lb-mini-head rtg-lb-mini-head-ridge">
              <span>{copy.ridgeBoardKicker}</span>
              <strong>{copy.ridgeBoardTitle}</strong>
            </div>

            <div className="rtg-lb-riders">
              {riders.length === 0 && <p className="rtg-lb-empty">{copy.ridgeEmptyText}</p>}
              {riders.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  className={`rtg-lb-rider${rider && r.id === rider.id ? " active" : ""}`}
                  aria-pressed={Boolean(rider && r.id === rider.id)}
                  onClick={() => setRiderId(r.id)}
                >
                  <span className="rtg-lb-rider-rank font-display">{i + 1}</span>
                  <span>
                    <b>{r.name}</b>
                    <small>{fill(copy.ridgeRiderLine, { avg: clock(r.avg), completion: r.completion })}</small>
                  </span>
                  <strong>{signed(r.improvement)}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rtg-lb-ridge-note">{copy.ridgeNote}</div>
      </Reveal>
    </section>
  );
}

export default function Leaderboard() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildLeaderboardPageCopy(settings), [settings]);
  const challenges = useLeaderboardChallenges();
  const sports = useLeaderboardSports();
  const ageGroups = useLeaderboardAgeGroups();
  const entries = useLeaderboardEntries();
  const ridgeSessions = useRidgeSessions();
  const ridgeResults = useRidgeResults();

  const [filters, setFilters] = useState(NO_FILTERS);
  const [metricKey, setMetricKey] = useState(METRICS[0].key);
  const ridgeRef = useRef(null);
  const metric = METRICS.find((m) => m.key === metricKey);
  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));

  const nameOf = (list, slug) => list.find((item) => item.slug === slug)?.name || "";
  // Gender pills: only the genders that actually appear on the board.
  const genders = useMemo(() => ["Male", "Female", "Other"].filter((g) => entries.some((row) => row.gender === g)), [entries]);

  // The athletes in view, best first by whatever the board is ranked by.
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const label = (list, slug) => list.find((item) => item.slug === slug)?.name || "";
    return entries
      .filter((row) => {
        if (filters.challenge !== ALL && row.challenge !== filters.challenge) return false;
        if (filters.gender !== ALL && row.gender !== filters.gender) return false;
        if (filters.age !== ALL && row.ageGroup !== filters.age) return false;
        if (filters.sport !== ALL && row.sport !== filters.sport) return false;
        return !q || `${row.name} ${row.city || ""} ${label(challenges, row.challenge)} ${label(sports, row.sport)}`.toLowerCase().includes(q);
      })
      .sort((a, b) => metric.value(b) - metric.value(a));
  }, [entries, filters, metric, challenges, sports]);

  const sportCounts = sports.map((sport) => ({ ...sport, count: rows.filter((row) => row.sport === sport.slug).length }));
  const ageCounts = ageGroups.map((group) => ({ ...group, count: rows.filter((row) => row.ageGroup === group.slug).length }));
  const maxAge = Math.max(1, ...ageCounts.map((group) => group.count));
  const avgConsistency = Math.round(average(rows, (row) => row.consistency));

  // Sport Mix ring: one slice per sport, sized by its share of the view.
  const filed = sum(sportCounts, (sport) => sport.count);
  let turned = 0;
  const slices = sportCounts
    .filter((sport) => sport.count > 0)
    .map((sport) => {
      const start = (turned / filed) * 360;
      turned += sport.count;
      return `${sport.color || "#dfe5ff"} ${start}deg ${(turned / filed) * 360}deg`;
    });

  const topSport = [...sportCounts].sort((a, b) => b.count - a.count)[0];
  const insight = rows.length
    ? fill(copy.insightText, {
        leader: rows[0].name,
        metric: copy[metric.label].toLowerCase(),
        sport: topSport && topSport.count ? topSport.name : copy.allSportsLabel,
        consistency: avgConsistency,
      })
    : copy.insightEmptyText;

  const summary = [
    filters.challenge === ALL ? copy.allChallengesLabel : nameOf(challenges, filters.challenge),
    filters.gender === ALL ? copy.allGendersLabel : filters.gender,
    filters.age === ALL ? copy.allAgesLabel : nameOf(ageGroups, filters.age),
    filters.sport === ALL ? copy.allSportsLabel : nameOf(sports, filters.sport),
  ].join(" • ");

  const kpis = [
    { tone: "cyan", label: copy.kpiAthletesLabel, value: pad2(rows.length), text: copy.kpiAthletesText },
    { tone: "pink", label: copy.kpiPointsLabel, value: formatNumber(sum(rows, (row) => row.points)), text: copy.kpiPointsText },
    { tone: "lime", label: copy.distanceLabel, value: `${formatNumber(Math.round(sum(rows, (row) => row.distance)))} ${copy.distanceUnit}`, text: copy.kpiDistanceText },
    { tone: "violet", label: copy.consistencyLabel, value: `${avgConsistency}%`, text: copy.kpiConsistencyText },
  ];

  const columns = [
    copy.rankColumn,
    copy.athleteLabel,
    copy.eventColumn,
    copy.sportColumn,
    copy.genderLabel,
    copy.ageLabel,
    copy.sessionsLabel,
    copy.distanceLabel,
    copy.consistencyLabel,
    copy.pointsLabel,
    copy.trendColumn,
  ];

  return (
    <div className="rtg-lb">
      <LeaderboardBackdrop />

      <div className="rtg-lb-shell">
        {/* Top strip — deliberately not a hero */}
        <Reveal as={motion.section} className="rtg-lb-command">
          <div className="rtg-lb-command-title">
            <span>{copy.kicker}</span>
            <h1>
              {copy.title} <b>{copy.titleAccent}</b>
            </h1>
            <p>{copy.text}</p>
          </div>
          <div className="rtg-lb-live">
            <span className="rtg-lb-live-dot" />
            <div>
              <small>{copy.liveLabel}</small>
              <strong>{copy.liveText}</strong>
            </div>
          </div>
        </Reveal>

        <FilterConsole
          copy={copy}
          filters={filters}
          setFilter={setFilter}
          metric={metric}
          setMetric={setMetricKey}
          challenges={challenges}
          genders={genders}
          ageGroups={ageGroups}
          sports={sports}
          summary={summary}
          onReset={() => {
            setFilters(NO_FILTERS);
            setMetricKey(METRICS[0].key);
          }}
          onJump={() => ridgeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />

        <section className="rtg-lb-kpis">
          {kpis.map((kpi, i) => (
            <Reveal as={motion.article} key={kpi.tone} className={`rtg-lb-kpi rtg-lb-kpi-${kpi.tone}`} delay={i * 0.06}>
              <span>{kpi.label}</span>
              <strong className="font-display">{kpi.value}</strong>
              <small>{kpi.text}</small>
              <i className="font-display">{pad2(i + 1)}</i>
            </Reveal>
          ))}
        </section>

        <section className="rtg-lb-performance">
          <Reveal className="rtg-lb-panel rtg-lb-podium-panel">
            <div className="rtg-lb-panel-head">
              <div>
                <span>{copy.podiumKicker}</span>
                <h2 className="font-display">{copy.podiumTitle}</h2>
              </div>
              <div className="rtg-lb-chip">{copy[metric.label]}</div>
            </div>

            <div className="rtg-lb-podium">
              {rows.length === 0 && <p className="rtg-lb-empty">{copy.emptyText}</p>}
              {rows.slice(0, PODIUM_SIZE).map((row, i) => (
                <article key={row.id} className={`rtg-lb-podium-card rtg-lb-rank-${i + 1}`}>
                  <div className="rtg-lb-podium-rank font-display">{i + 1}</div>
                  <div className="rtg-lb-podium-name">{row.name}</div>
                  <div className="rtg-lb-podium-meta">
                    {[nameOf(sports, row.sport), row.gender, nameOf(ageGroups, row.ageGroup)].filter(Boolean).join(" • ")}
                    <br />
                    {nameOf(challenges, row.challenge)}
                  </div>
                  <div className="rtg-lb-podium-score font-display">
                    {metric.show(metric.value(row))}
                    <small>{copy[metric.unit]}</small>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>

          <MomentumChart copy={copy} rows={rows} />
        </section>

        <section className="rtg-lb-analysis">
          <Reveal as={motion.article} className="rtg-lb-panel rtg-lb-analysis-card">
            <div className="rtg-lb-mini-head">
              <span>{copy.sportMixKicker}</span>
              <strong>{copy.sportMixTitle}</strong>
            </div>
            <div className="rtg-lb-donut-wrap">
              <div className="rtg-lb-donut" style={slices.length ? { background: `conic-gradient(${slices.join(",")})` } : undefined}>
                <div>
                  <strong className="font-display">{rows.length}</strong>
                  <span>{copy.kpiAthletesLabel}</span>
                </div>
              </div>
              <div className="rtg-lb-legend">
                {sportCounts.map((sport) => (
                  <div key={sport.slug} className="rtg-lb-legend-row">
                    <i style={sport.color ? { background: sport.color } : undefined} />
                    <span>{sport.name}</span>
                    <b>{sport.count}</b>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal as={motion.article} className="rtg-lb-panel rtg-lb-analysis-card" delay={0.06}>
            <div className="rtg-lb-mini-head">
              <span>{copy.ageKicker}</span>
              <strong>{copy.ageTitle}</strong>
            </div>
            <div className="rtg-lb-age-bars">
              {ageCounts.map((group) => (
                <div key={group.slug} className="rtg-lb-age-row">
                  <span>{group.name}</span>
                  <div className="rtg-lb-age-track">
                    <i style={{ width: `${(group.count / maxAge) * 100}%` }} />
                  </div>
                  <b>{group.count}</b>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal as={motion.article} className="rtg-lb-panel rtg-lb-analysis-card rtg-lb-insight-card" delay={0.12}>
            <div className="rtg-lb-mini-head">
              <span>{copy.insightKicker}</span>
              <strong>{copy.insightTitle}</strong>
            </div>
            <div className="rtg-lb-insight">
              <span className="rtg-lb-insight-orb">{copy.insightBadge}</span>
              <p>{insight}</p>
            </div>
            <div className="rtg-lb-insight-tags">
              {splitList(copy.insightTags).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </Reveal>
        </section>

        <Reveal as={motion.section} className="rtg-lb-panel rtg-lb-board" amount={0.05}>
          <div className="rtg-lb-board-head">
            <div>
              <span>{copy.boardKicker}</span>
              <h2 className="font-display">{copy.boardTitle}</h2>
            </div>
            <div className="rtg-lb-board-meta">
              <span>
                {rows.length} {rows.length === 1 ? copy.athleteLabel : copy.kpiAthletesLabel}
              </span>
              <b>{copy.boardBadge}</b>
            </div>
          </div>

          <div className="rtg-lb-table-scroll">
            <table className="rtg-lb-table">
              <thead>
                <tr>
                  {columns.map((column, i) => (
                    <th key={i} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length}>{copy.emptyText}</td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="rtg-lb-rank-cell font-display">{pad2(i + 1)}</td>
                    <td className="rtg-lb-athlete-cell">
                      <strong>{row.name}</strong>
                      {row.city && <small>{row.city}</small>}
                    </td>
                    <td>{nameOf(challenges, row.challenge)}</td>
                    <td>{nameOf(sports, row.sport)}</td>
                    <td>{row.gender}</td>
                    <td>{nameOf(ageGroups, row.ageGroup)}</td>
                    <td>{row.sessions}</td>
                    <td>
                      {formatNumber(row.distance)} {copy.distanceUnit}
                    </td>
                    <td>
                      <div className="rtg-lb-consistency">
                        <div className="rtg-lb-consistency-track">
                          <i style={{ width: `${row.consistency}%` }} />
                        </div>
                        <span>{row.consistency}%</span>
                      </div>
                    </td>
                    <td className="rtg-lb-points-cell">{formatNumber(row.points)}</td>
                    <td>
                      <Sparkline trend={row.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <RidgeLab copy={copy} sessions={ridgeSessions} results={ridgeResults} sectionRef={ridgeRef} />
      </div>
    </div>
  );
}
