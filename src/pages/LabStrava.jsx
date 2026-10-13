import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LabBackdrop from "../components/lab/LabBackdrop";
import LabDialog from "../components/lab/LabDialog";
import RichText from "../components/lab/RichText";
import { ConnectWithStrava, PoweredByStrava, STRAVA_URL } from "../components/lab/StravaBrand";
import useSession from "../lib/useSession";
import useAuthProviders from "../lib/useAuthProviders";
import { useAuthGate } from "../lib/AuthGateContext";
import { supabase } from "../lib/supabaseClient";
import { useSiteSettings } from "../lib/publicData";
import {
  DAY,
  buildLabCopy,
  fill,
  formatDay,
  metricOf,
  periodRange,
  previousRange,
  rankBoard,
  seriesOf,
  useLabAccessSteps,
  useLabAgeGroups,
  useLabPeriods,
  useLabRegistration,
  useLabSports,
  useStravaBoard,
  useStravaLinked,
} from "../lib/labData";

// ============================================================================
// RTG CLUB LAB (/lab/strava) — the Strava-fed challenge board — opens with the access window (log in ->
// register -> open your lab) over the dashboard; "Explore dashboard" closes
// it. /lab/strava?view=board goes straight to the dashboard.
//
// The board is real: lab_strava_board() in the database adds up the Strava
// activities of members who REGISTERED for the challenge (lab_registrations)
// — a member who has not registered is never shown. Until the first member
// registers, the sample athletes of lab_activities are shown instead, and
// the page says so.
//
//   lab_sports / lab_periods / lab_age_groups   the buttons and filters
//   lab_access_steps                            the steps of the window
//   lab_activities (Admin -> Lab — Manual Activities)  hand-typed + samples
//   "text.lab.<field>" (Admin -> Site Content -> Lab)  every wording
//
// Strava's logo and button are Strava's own files (components/lab/
// StravaBrand.jsx). Layout is in styles/lab.css under .rtg-lab.
// ============================================================================

const PROGRAMME = "strava-challenge"; // lab_programmes.slug of this lab
const ALL = "all";
const PERIOD_CHOICES = 3; // the current period and the two before it
const SERIES_COLORS = ["#f76b1c", "#8060be", "#23a8b6"];
const UNITS = { distance: "km", speed: "km/h", elevation: "m" };

const fmt = (n, digits = 1) =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
const signedPercent = (n) => `${n >= 0 ? "+" : ""}${fmt(n)}%`;
// km/h -> "5:12" minutes per km.
const pace = (speed) => {
  const seconds = Math.round(3600 / speed);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

// ----------------------------------------------------------------------------
// ACCESS WINDOW — the steps, what to do next, and Strava's own button.
// ----------------------------------------------------------------------------
function AccessWindow({ copy, steps, user, registered, stravaLinked, canConnect, onLogin, onRegister, onConnect, onExplore, busy, error }) {
  const done = { login: Boolean(user), register: registered, open: registered && stravaLinked !== false };
  const note = !user
    ? [copy.noteGuestTitle, copy.noteGuestText]
    : !registered
      ? [copy.noteMemberTitle, copy.noteMemberText]
      : stravaLinked === false
        ? [copy.noteStravaTitle, copy.noteStravaText]
        : [copy.noteReadyTitle, copy.noteReadyText];

  return (
    <>
      <Link to="/lab" className="close" aria-label={copy.backLabel}>
        ×
      </Link>
      <div className="eyebrow">{copy.accessEyebrow}</div>
      <h2 id="lab-access-title">{copy.accessTitle}</h2>
      <p>{copy.accessText}</p>

      <ol className="access-steps">
        {steps.map((step, i) => (
          <li key={step.id} className={done[step.step] ? "done" : undefined}>
            <b>{done[step.step] ? "✓" : String(i + 1).padStart(2, "0")}</b>
            <div>
              <strong>{step.title}</strong>
              <span>{done[step.step] ? copy.stepDoneLabel : step.text}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="connection-note">
        <b>{note[0]}</b>
        <p>{note[1]}</p>
        {user && registered && stravaLinked === false && canConnect && (
          <ConnectWithStrava onClick={onConnect} alt={copy.connectAlt} disabled={busy} />
        )}
      </div>
      {error && <p className="access-error">{error}</p>}

      <div className="modal-actions">
        {!user && (
          <button type="button" className="button purple" onClick={onLogin}>
            {copy.loginLabel}
          </button>
        )}
        {user && !registered && (
          <button type="button" className="button purple" onClick={onRegister} disabled={busy}>
            {busy ? copy.registeringLabel : copy.registerLabel}
          </button>
        )}
        <button type="button" className="button" onClick={onExplore}>
          {registered ? copy.openLabel : copy.exploreLabel}
        </button>
        <Link to="/lab" className="outline">
          {copy.backLabel}
        </Link>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// HEAD TO HEAD — the top three's journey through the period.
// ----------------------------------------------------------------------------
function JourneyChart({ rows, range, metric, title, emptyText }) {
  if (!rows.length) return <div className="empty">{emptyText}</div>;
  const unit = UNITS[metric];
  const datasets = rows.map((athlete) => seriesOf(athlete, metric));
  const max = Math.max(1, ...datasets.flat()) * 1.12;
  const bins = datasets[0].length;
  const x = (j) => 55 + (j * 565) / Math.max(1, bins - 1);
  const y = (value) => 200 - (value / max) * 180;
  const days = (range.cutoff - range.start) / DAY;
  const tick = (j) => formatDay(range.start + Math.max(0, Math.ceil((days * (j + 1)) / bins) - 1) * DAY);
  const ticks = [0, Math.floor((bins - 1) / 2), bins - 1];

  return (
    <svg viewBox="0 0 640 260" role="img" aria-label={`${title} (${unit})`}>
      <title>{title}</title>
      <desc>{rows.map((a, i) => `${a.name}: ${fmt(datasets[i][bins - 1])} ${unit}`).join("; ")}</desc>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <path className="gridline" d={`M55 ${20 + i * 45}H620`} />
          <text x="44" y={24 + i * 45} textAnchor="end">
            {fmt(max * (1 - i / 4), 0)}
          </text>
        </g>
      ))}
      {datasets.map((data, i) => (
        <g key={rows[i].id}>
          <polyline
            points={data.map((value, j) => `${x(j)},${y(value)}`).join(" ")}
            fill="none"
            stroke={SERIES_COLORS[i]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data.map((value, j) => (
            <circle key={j} cx={x(j)} cy={y(value)} r="4" fill={SERIES_COLORS[i]} stroke="white" strokeWidth="2">
              <title>{`${rows[i].name}: ${fmt(value)} ${unit}`}</title>
            </circle>
          ))}
        </g>
      ))}
      {ticks.map((j, i) => (
        <text key={j} x={x(j)} y="235" textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
          {tick(j)}
        </text>
      ))}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// PAGE
// ----------------------------------------------------------------------------
export default function LabStrava() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildLabCopy(settings), [settings]);
  const { user } = useSession();
  const { requestLogin } = useAuthGate();
  const providers = useAuthProviders();
  const [params, setParams] = useSearchParams();

  const sports = useLabSports();
  const periods = useLabPeriods();
  const ageGroups = useLabAgeGroups();
  const steps = useLabAccessSteps();
  const { registered, register } = useLabRegistration(user?.id, PROGRAMME);
  const stravaLinked = useStravaLinked(user?.id);

  // The access window is what the page opens with.
  const [gate, setGate] = useState(params.get("view") !== "board");
  const [busy, setBusy] = useState(false);
  const [gateError, setGateError] = useState("");
  const [method, setMethod] = useState(false);

  const [filters, setFilters] = useState({ sport: "", period: "", offset: 0, gender: ALL, age: ALL, metric: "distance" });
  const [athleteId, setAthleteId] = useState("");
  const [search, setSearch] = useState("");

  const sport = sports.find((s) => s.slug === filters.sport) || sports[0] || null;
  const period = periods.find((p) => p.slug === filters.period) || periods[0] || null;
  const ageGroup = ageGroups.find((g) => g.slug === filters.age) || null;
  const metric = filters.metric;
  const unit = UNITS[metric];
  const metricName = { distance: copy.distanceLabel, speed: copy.speedLabel, elevation: copy.elevationLabel }[metric];

  const range = useMemo(() => (period ? periodRange(period.kind, filters.offset) : null), [period, filters.offset]);
  const prior = useMemo(() => (period ? previousRange(period.kind, filters.offset) : null), [period, filters.offset]);
  const board = useStravaBoard(sport?.slug, range, prior);

  const rows = useMemo(
    () => rankBoard(board.rows, { metric, gender: filters.gender, ageGroup, sport }),
    [board.rows, metric, filters.gender, ageGroup, sport]
  );
  // Sample athletes are only ever returned when no member has registered.
  const sample = board.rows.length > 0 && board.rows.every((a) => a.sample);
  const totals = rows.reduce(
    (sum, a) => ({ distance: sum.distance + a.distance, elevation: sum.elevation + a.elevation, activities: sum.activities + a.activities }),
    { distance: 0, elevation: 0, activities: 0 }
  );
  const podium = rows.slice(0, 3);
  const chosen = rows.find((a) => a.id === athleteId) || rows[0] || null;
  const query = search.trim().toLowerCase();
  const tableRows = rows.filter((a) => `${a.name} ${a.city}`.toLowerCase().includes(query));

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => {
    setFilters({ sport: "", period: "", offset: 0, gender: ALL, age: ALL, metric: "distance" });
    setSearch("");
    setAthleteId("");
  };

  const explore = () => {
    setGate(false);
    if (params.get("view") !== "board") setParams({ view: "board" }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  // The site's login pop-up opens on top of this window; once the member is
  // in, the window is already showing their next step.
  const login = () => requestLogin("login");
  const handleRegister = async () => {
    setBusy(true);
    setGateError("");
    try {
      await register();
    } catch {
      setGateError(copy.registerError);
    } finally {
      setBusy(false);
    }
  };
  // Same flow as the Dashboard's "Connect Strava": Strava sends the browser
  // away and back, so `busy` is only cleared if it never leaves.
  const connectStrava = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/strava/connect-start", {
        method: "POST",
        headers: { Authorization: `Bearer ${data?.session?.access_token}` },
      });
      if (!res.ok) throw new Error("not_ok");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  };

  const periodChoices = period
    ? Array.from({ length: PERIOD_CHOICES }, (_, i) => {
        const r = periodRange(period.kind, i);
        return { offset: i, label: `${formatDay(r.start)} – ${formatDay(r.cutoff - DAY)}${i === 0 ? ` · ${copy.toDateLabel}` : ""}` };
      })
    : [];
  const genderName = { [ALL]: copy.allGendersLabel, female: copy.womenLabel, male: copy.menLabel }[filters.gender];
  const chartTitle = metric === "speed" ? copy.chartTitleSpeed : fill(copy.chartTitle, { metric: metricName.toLowerCase() });
  const gainLine = (a) => (a.change === null ? copy.noPriorLabel : `${signedPercent(a.change)} ${copy.vsPriorLabel}`);
  const personLine = (a) => [a.city, a.age !== null && `${a.age} ${copy.yearsLabel}`, a.sample && copy.sampleTag].filter(Boolean).join(" · ");

  return (
    <div className="rtg-lab">
      <LabBackdrop />

      <section className="shell dashboard" aria-labelledby="lab-dash-title">
        <div className="dash-top">
          <Link className="text-button" to="/lab">
            {copy.dashBackLabel}
          </Link>
          <span className={sample ? "demo-badge" : "demo-badge live"}>{sample ? copy.dashBadgeSample : copy.dashBadgeLive}</span>
        </div>

        <div className="section-heading">
          <div>
            <div className="eyebrow orange-text">{copy.dashEyebrow}</div>
            <h1 id="lab-dash-title">
              {copy.dashTitle} <span>{copy.dashTitleAccent}</span>
            </h1>
            <p>{sample ? copy.dashTextSample : copy.dashTextLive}</p>
          </div>
          <div className="dash-side">
            <a href={STRAVA_URL} target="_blank" rel="noopener noreferrer" aria-label={copy.stravaLinkLabel}>
              <PoweredByStrava alt={copy.poweredAlt} />
            </a>
            <button type="button" className="outline" onClick={() => setGate(true)}>
              {copy.dashAccessLabel}
            </button>
          </div>
        </div>

        <div className="sport-row">
          <div className="segments" role="group" aria-label={copy.tableEyebrow}>
            {sports.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.slug === sport?.slug} onClick={() => { set({ sport: s.slug }); setAthleteId(""); }}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="segments periods" role="group" aria-label={copy.periodLabel}>
            {periods.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.slug === period?.slug} onClick={() => set({ period: p.slug, offset: 0 })}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-panel">
          <label>
            {copy.periodLabel}
            <select value={filters.offset} onChange={(e) => set({ offset: Number(e.target.value) })}>
              {periodChoices.map((choice) => (
                <option key={choice.offset} value={choice.offset}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.genderLabel}
            <select value={filters.gender} onChange={(e) => set({ gender: e.target.value })}>
              <option value={ALL}>{copy.allGendersLabel}</option>
              <option value="female">{copy.womenLabel}</option>
              <option value="male">{copy.menLabel}</option>
            </select>
          </label>
          <label>
            {copy.ageLabel}
            <select value={filters.age} onChange={(e) => set({ age: e.target.value })}>
              <option value={ALL}>{copy.allAgesLabel}</option>
              {ageGroups.map((group) => (
                <option key={group.id} value={group.slug}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.metricLabel}
            <select value={metric} onChange={(e) => set({ metric: e.target.value })}>
              <option value="distance">{`${copy.distanceLabel} · ${UNITS.distance}`}</option>
              <option value="speed">{`${copy.speedLabel} · ${UNITS.speed}`}</option>
              <option value="elevation">{`${copy.elevationLabel} · ${UNITS.elevation}`}</option>
            </select>
          </label>
          <button type="button" className="text-button" onClick={reset}>
            {copy.resetLabel}
          </button>
        </div>

        <div className="rank-caption">
          <span aria-live="polite">
            {board.loading
              ? copy.loadingText
              : [sport?.name, genderName, ageGroup ? ageGroup.name : copy.allAgesLabel, range && `${formatDay(range.start)} – ${formatDay(range.cutoff - DAY)}`]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
          <button type="button" className="text-button" onClick={() => setMethod(true)}>
            {copy.methodLabel}
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <small>{copy.statAthletes}</small>
            <strong>{rows.length}</strong>
          </div>
          <div className="stat">
            <small>{copy.statDistance}</small>
            <strong>
              {fmt(totals.distance)}
              <span>{UNITS.distance}</span>
            </strong>
          </div>
          <div className="stat">
            <small>{copy.statAscent}</small>
            <strong>
              {fmt(totals.elevation, 0)}
              <span>{UNITS.elevation}</span>
            </strong>
          </div>
          <div className="stat">
            <small>{copy.statEfforts}</small>
            <strong>
              {totals.activities}
              <span>{copy.effortsUnit}</span>
            </strong>
          </div>
        </div>

        <div className="section-heading compact">
          <div>
            <div className="eyebrow">{copy.podiumEyebrow}</div>
            <h2>
              {copy.podiumTitle} <span>{metricName.toLowerCase()}.</span>
            </h2>
          </div>
          <span className="subtle">{copy.podiumNote}</span>
        </div>

        <div className="podium" aria-live="polite">
          {podium.length ? (
            podium.map((a, i) => (
              <article key={a.id} className={i === 0 ? "podium-card first" : "podium-card"}>
                <span className="podium-rank" aria-hidden="true">
                  {a.rank}
                </span>
                <div className="podium-label">
                  {a.rank === 1 ? copy.leaderLabel : copy.podiumLabel} · #{a.rank}
                </div>
                <div className="avatar" aria-hidden="true">
                  {a.avatar ? <img src={a.avatar} alt="" loading="lazy" /> : initials(a.name)}
                </div>
                <h3>{a.name}</h3>
                <p>{personLine(a)}</p>
                <div className="podium-value">
                  {fmt(a.value, metric === "elevation" ? 0 : 1)} <small>{unit}</small>
                </div>
                <div className={a.change !== null && a.change < 0 ? "gain loss" : "gain"}>{gainLine(a)}</div>
              </article>
            ))
          ) : (
            <div className="empty">
              <strong>{copy.emptyTitle}</strong>
              {copy.emptyText}
            </div>
          )}
        </div>

        <div className="chart-grid">
          <article className="chart-card">
            <div className="chart-heading">
              <div>
                <div className="eyebrow">{copy.chartEyebrow}</div>
                <h3>{chartTitle}</h3>
              </div>
              <span className="pill">{copy.chartBadge}</span>
            </div>
            {range && <JourneyChart rows={podium} range={range} metric={metric} title={chartTitle} emptyText={copy.chartEmpty} />}
            <div className="legend">
              {podium.map((a, i) => (
                <span key={a.id}>
                  <i style={{ background: SERIES_COLORS[i] }} />
                  {a.name}
                </span>
              ))}
            </div>
          </article>

          <article className="chart-card progress-card">
            <div className="eyebrow">{copy.benchEyebrow}</div>
            <h3>{copy.benchTitle}</h3>
            <label className="athlete-label">
              {copy.benchSelectLabel}
              <select value={chosen?.id || ""} onChange={(e) => setAthleteId(e.target.value)} disabled={!rows.length}>
                {rows.map((a) => (
                  <option key={a.id} value={a.id}>
                    {[a.name, a.city].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
            {chosen ? (
              <div>
                <div className="personal-value">
                  <strong>{chosen.change === null ? "—" : signedPercent(chosen.change)}</strong>
                  <span>
                    {metricName.toLowerCase()}
                    <br />
                    {chosen.change === null ? copy.noPriorLabel : copy.vsPriorLabel}
                  </span>
                </div>
                {(() => {
                  const top = Math.max(chosen.value, chosen.oldValue, 1);
                  return (
                    <>
                      <div className="compare-row">
                        <span>{copy.benchSelectedLabel}</span>
                        <div className="bar-track">
                          <i style={{ width: `${(chosen.value / top) * 100}%` }} />
                        </div>
                        <b>
                          {fmt(chosen.value)} {unit}
                        </b>
                      </div>
                      <div className="compare-row previous">
                        <span>{copy.benchPreviousLabel}</span>
                        <div className="bar-track">
                          <i style={{ width: `${(chosen.oldValue / top) * 100}%` }} />
                        </div>
                        <b>{chosen.prior ? `${fmt(chosen.oldValue)} ${unit}` : "—"}</b>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p>{copy.benchEmpty}</p>
            )}
            <small>{copy.benchNote}</small>
          </article>
        </div>

        <article className="ranking-card">
          <div className="section-heading compact">
            <div>
              <div className="eyebrow">{copy.tableEyebrow}</div>
              <h2>
                {copy.tableTitle} <span>{copy.tableTitleAccent}</span>
              </h2>
            </div>
            <label className="search">
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <input type="search" placeholder={copy.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{copy.colRank}</th>
                  <th scope="col">{copy.colAthlete}</th>
                  <th scope="col">{copy.colDistance}</th>
                  <th scope="col">{sport?.showPace ? copy.colSpeedPace : copy.colSpeed}</th>
                  <th scope="col">{copy.colElevation}</th>
                  <th scope="col">{copy.colProgress}</th>
                  <th scope="col">{copy.colActivities}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length ? (
                  tableRows.map((a) => {
                    const speed = metricOf(a, "speed");
                    const who = [a.city, a.gender === "female" ? copy.womanLabel : a.gender === "male" ? copy.manLabel : "", a.age !== null && `${a.age} ${copy.yearsLabel}`]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={a.id}>
                        <td>
                          <span className="rank">{a.rank}</span>
                        </td>
                        <td>
                          <strong>{a.name}</strong>
                          <small>{who}</small>
                        </td>
                        <td>
                          {fmt(a.distance)} {UNITS.distance}
                        </td>
                        <td>
                          {fmt(speed)} {UNITS.speed}
                          {sport?.showPace && speed > 0 && <small>{pace(speed)} /km</small>}
                        </td>
                        <td>
                          {fmt(a.elevation, 0)} {UNITS.elevation}
                        </td>
                        <td className={a.change !== null && a.change < 0 ? "loss" : "gain"}>
                          {a.change === null ? "—" : signedPercent(a.change)}
                          <small>{metricName.toLowerCase()}</small>
                        </td>
                        <td>{a.activities}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">
                        <strong>{rows.length ? copy.tableEmptyTitle : copy.emptyTitle}</strong>
                        {rows.length ? copy.tableEmptyText : copy.emptyText}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="subtle">{fill(copy.tableCount, { shown: tableRows.length, total: rows.length })}</p>
        </article>

        <div className="preview-footer">
          <b>{copy.footNoteTitle}</b> {sample ? copy.footNoteSample : copy.footNote}
        </div>
      </section>

      <LabDialog open={gate} onClose={() => setGate(false)} labelledBy="lab-access-title" className="access-dialog">
        <AccessWindow
          copy={copy}
          steps={steps}
          user={user}
          registered={registered}
          stravaLinked={stravaLinked}
          canConnect={Boolean(providers.strava)}
          onLogin={login}
          onRegister={handleRegister}
          onConnect={connectStrava}
          onExplore={explore}
          busy={busy}
          error={gateError}
        />
      </LabDialog>

      <LabDialog open={method} onClose={() => setMethod(false)} labelledBy="lab-method-title">
        <button type="button" className="close" onClick={() => setMethod(false)} aria-label={copy.infoCloseLabel}>
          ×
        </button>
        <div className="eyebrow">{copy.infoEyebrow}</div>
        <h2 id="lab-method-title">{copy.methodTitle}</h2>
        <div>
          <RichText text={copy.methodBody} />
        </div>
        <button type="button" className="button" onClick={() => setMethod(false)}>
          {copy.infoCloseLabel}
        </button>
      </LabDialog>
    </div>
  );
}
