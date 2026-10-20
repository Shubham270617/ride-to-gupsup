import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LabBackdrop from "../components/lab/LabBackdrop";
import LabDialog from "../components/lab/LabDialog";
import RichText, { Inline } from "../components/lab/RichText";
import RidgeSessionStory from "../components/lab/RidgeSessionStory";
import RidgeCardMaker from "../components/lab/RidgeCardMaker";
import MembershipPlans from "../components/lab/MembershipPlans";
import { useJoinCommunity } from "../lib/JoinCommunityContext";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useSiteImages, useSiteSettings } from "../lib/publicData";
import {
  averageProgress,
  buildLabCopy,
  buildRidgeCopy,
  buildRidgeFeed,
  clockToSeconds,
  fill,
  overallRecord,
  ridgeStandings,
  riderKey,
  secondsToClock,
  sessionAwards,
  sessionProgressRank,
  trendPoints,
  useLabAccessSteps,
  useLabRegistration,
  useRidgeFeed,
} from "../lib/labData";

// ============================================================================
// RIDGE REPEATS LAB (/lab/ridge) — "You vs You": the same loop, up to five
// times, every Saturday. Four ways to rank the riders, the top three, the
// progress journeys chart and heatmap, the full standings, the Session
// Spotlight awards, a rider's own record, and a photo card to share. The
// session packs sit at the bottom.
//
// The native admin publishes an atomic snapshot to ridge_publication.
// Historical points and organiser corrections are retained in that snapshot.
// Membership plans and page wording continue to use existing admin settings.
// ============================================================================

const MODES = ["overall", "progress", "points", "alltime"];
const PODIUM_SIZE = 3;
const SERIES_TONES = 6; // .rr-series-1 … .rr-series-6
const SESSION_BUTTON_LIMIT = 7; // more sessions than this -> a dropdown

const isNumber = (n) => n !== null && n !== undefined && Number.isFinite(Number(n));
const fixed = (n) => (isNumber(n) ? Number(n).toFixed(2) : "—");
const signed = (n) => (isNumber(n) ? `${Number(n) > 0 ? "+" : ""}${Number(n).toFixed(2)}` : "—");
const polarity = (n) => (isNumber(n) && n > 0 ? "positive" : isNumber(n) && n < 0 ? "negative" : "");
const dateLabel = (iso) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "";
const shortDate = (iso) => dateLabel(iso).replace(/ \d{4}$/, "");
const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

// The width of an element, kept up to date — the charts are drawn to it.
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.round(node.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function Avatar({ name, photo }) {
  return (
    <span className="rr-avatar" aria-hidden="true">
      {photo ? <img src={photo} alt="" loading="lazy" /> : initials(name)}
    </span>
  );
}

function LoopDots({ count, max }) {
  return (
    <span className="rr-loop-dots" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < count ? "done" : undefined} />
      ))}
    </span>
  );
}

// A rider's journey in miniature, for the overall standings.
function Sparkline({ points }) {
  const known = points.filter((p) => p.value !== null);
  if (!known.length) return null;
  const lo = Math.min(0, ...known.map((p) => p.value));
  const hi = Math.max(0, ...known.map((p) => p.value));
  const span = Math.max(0.5, hi - lo);
  const first = points[0].stamp;
  const last = points[points.length - 1].stamp;
  const x = (stamp) => (last === first ? 41 : 5 + ((stamp - first) / (last - first)) * 72);
  const y = (value) => 23 - ((value - lo) / span) * 18;
  let d = "";
  let joined = false;
  points.forEach((p) => {
    if (p.value === null) {
      joined = false;
      return;
    }
    d += `${joined ? " L " : " M "}${x(p.stamp).toFixed(2)} ${y(p.value).toFixed(2)}`;
    joined = true;
  });
  return (
    <svg className="rr-sparkline" viewBox="0 0 82 28" width="82" height="28" aria-hidden="true">
      <path d={d} />
      {known.map((p) => (
        <circle key={p.session} cx={x(p.stamp).toFixed(2)} cy={y(p.value).toFixed(2)} r="2.5" />
      ))}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// PROGRESS JOURNEYS — each rider's gain over their own first qualifying
// session, across every published session. A missed session is a gap.
// ----------------------------------------------------------------------------
function TrendChart({ series, dates, selected, copy, single = false }) {
  const [ref, width] = useWidth();
  const visible = series.filter((s) => !s.hidden || single);

  let chart = null;
  if (!dates.length || !visible.length) {
    chart = <p className="rr-empty">{series.length ? copy.chartChoose : copy.chartEmpty}</p>;
  } else if (width >= 180) {
    const values = [0, ...visible.flatMap((s) => s.points.filter((p) => p.value !== null).map((p) => p.value))];
    const lowest = Math.min(...values);
    const highest = Math.max(...values);
    const pad = Math.max(0.5, (highest - lowest) * 0.15);
    const min = lowest - pad;
    const max = highest + pad;
    const height = 282;
    const left = 64;
    const right = width - 18;
    const top = 34;
    const bottom = 219;
    const first = dates[0].stamp;
    const last = dates[dates.length - 1].stamp;
    const x = (stamp) => (first === last ? (left + right) / 2 : left + 8 + ((stamp - first) / (last - first)) * (right - left - 16));
    const y = (value) => bottom - 8 - ((value - min) / (max - min)) * (bottom - top - 16);
    const tickCount = Math.min(dates.length, width < 500 ? 4 : 7);
    const tickIndices = [...new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (dates.length - 1)) / Math.max(1, tickCount - 1))))];
    const yTicks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3);
    const guide = dates.find((d) => d.slug === selected) || dates[dates.length - 1];

    chart = (
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={copy.journeysTitle}>
        <rect className="rr-chart-frame" x={left} y={top} width={right - left} height={bottom - top} />
        {yTicks.map((value) => (
          <text key={value} className="rr-trend-axis" x={left - 10} y={y(value) + 4} textAnchor="end">
            {value > 0 ? "+" : ""}
            {value.toFixed(1)}
          </text>
        ))}
        <line className="rr-chart-zero" x1={left} x2={right} y1={y(0)} y2={y(0)} />
        {tickIndices.map((i) => (
          <text key={dates[i].slug} className="rr-trend-axis" x={x(dates[i].stamp)} y="242" textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}>
            {shortDate(dates[i].date)}
          </text>
        ))}
        <text className="rr-trend-axis axis-title" x={left} y="16">
          {copy.axisGain}
        </text>
        <text className="rr-trend-axis axis-title" x={(left + right) / 2} y="270" textAnchor="middle">
          {copy.axisSession}
        </text>
        {visible.map((s) => {
          let d = "";
          let joined = false;
          s.points.forEach((p) => {
            if (p.value === null) {
              joined = false;
              return;
            }
            d += `${joined ? " L " : " M "}${x(p.stamp).toFixed(2)} ${y(p.value).toFixed(2)}`;
            joined = true;
          });
          return (
            <g key={s.name} className={`rr-trend-series rr-series-${s.tone}`}>
              <path d={d} />
              {s.points
                .filter((p) => p.value !== null)
                .map((p) =>
                  s.shape === 0 ? (
                    <circle key={p.session} cx={x(p.stamp)} cy={y(p.value)} r="5" />
                  ) : (
                    <rect
                      key={p.session}
                      x={x(p.stamp) - 4}
                      y={y(p.value) - 4}
                      width="8"
                      height="8"
                      transform={s.shape === 2 ? `rotate(45 ${x(p.stamp)} ${y(p.value)})` : undefined}
                    />
                  )
                )}
            </g>
          );
        })}
        {guide && <line className="rr-chart-guide" x1={x(guide.stamp)} x2={x(guide.stamp)} y1={top} y2={bottom} />}
      </svg>
    );
  }

  return (
    <div className="rr-trend-chart" ref={ref}>
      {chart}
    </div>
  );
}

// One session's loop times as a line — lower is faster.
function PaceChart({ row, maxLoops, copy }) {
  const [ref, width] = useWidth();
  const values = Array.from({ length: maxLoops }, (_, i) => (i < row.laps ? row.lapSeconds[i] ?? null : null));
  const known = values.filter((v) => v !== null);

  let chart = null;
  if (!known.length) {
    chart = <p className="rr-empty">{copy.paceEmpty}</p>;
  } else if (width >= 180) {
    const height = 210;
    const left = 53;
    const right = width - 18;
    const top = 28;
    const bottom = 161;
    const lo = Math.min(...known);
    const hi = Math.max(...known);
    const padding = Math.max(15, (hi - lo) * 0.15);
    const min = Math.max(0, lo - padding);
    const max = hi + padding;
    const y = (value) => bottom - ((value - min) / (max - min)) * (bottom - top);
    const x = (i) => left + 8 + ((right - left - 16) * i) / Math.max(1, maxLoops - 1);
    let d = "";
    let joined = false;
    values.forEach((value, i) => {
      if (value === null) {
        joined = false;
        return;
      }
      d += `${joined ? " L " : " M "}${x(i).toFixed(2)} ${y(value).toFixed(2)}`;
      joined = true;
    });
    chart = (
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={copy.paceTitle}>
        <rect className="rr-chart-frame" x={left} y={top} width={right - left} height={bottom - top} />
        {[min, (min + max) / 2, max].map((value) => (
          <text key={value} className="rr-chart-text" x={left - 8} y={y(value) + 4} textAnchor="end">
            {secondsToClock(value)}
          </text>
        ))}
        <text className="rr-chart-text" x={left} y="13">
          {copy.paceAxisTime}
        </text>
        {values.map((_, i) => (
          <text key={i} className="rr-chart-text" x={x(i)} y="181" textAnchor="middle">
            L{i + 1}
          </text>
        ))}
        <text className="rr-chart-text" x={(left + right) / 2} y="202" textAnchor="middle">
          {copy.paceAxisLoop}
        </text>
        <path className="rr-pace-line" d={d} />
        {values.map((value, i) => (value === null ? null : <circle key={i} className="rr-pace-dot" cx={x(i).toFixed(2)} cy={y(value).toFixed(2)} r="5" />))}
      </svg>
    );
  }
  return (
    <div className="rr-pace-chart" ref={ref}>
      {chart}
    </div>
  );
}

// ----------------------------------------------------------------------------
// RIDER RECORD — one rider: their overall journey, then any one session.
// ----------------------------------------------------------------------------
function RiderRecord({ feed, name, sessionSlug, onSession, copy, loopKm, onCard }) {
  const profile = feed.riders.find((p) => riderKey(p.name) === riderKey(name));
  const overallRows = useMemo(() => ridgeStandings(feed, "overall"), [feed]);
  if (!profile) return null;
  const overall = overallRows.find((row) => riderKey(row.name) === riderKey(name)) || overallRecord(profile);
  const row = profile.records.find((r) => r.session === sessionSlug) || profile.records[0];
  const maxLoops = feed.maxLoops;
  const loops = Math.min(row.laps, maxLoops);
  const place = sessionProgressRank(feed, name, row.session);
  const dates = feed.sessions.slice().reverse();
  const series = overall.qualifying.length ? [{ name, tone: 1, shape: 0, hidden: false, points: trendPoints(feed, overall) }] : [];

  return (
    <div>
      <div className="rr-detail-title">
        <Avatar name={name} photo={profile.photo} />
        <div>
          <h2 id="rr-rider-name">{name}</h2>
          <p>{fill(copy.recordSummary, { count: profile.records.length, points: fixed(profile.totalPoints) })}</p>
        </div>
      </div>

      <section className="rr-personal-trend">
        <div className="rr-chart-head">
          <b>{copy.recordTrendTitle}</b>
          <span>{overall.value === null ? copy.recordTrendWaiting : `#${overall.place} · ${signed(overall.value)} ${copy.unitGain}`}</span>
        </div>
        <TrendChart series={series} dates={dates} selected={row.session} copy={copy} single />
        <p className="rr-detail-note">
          {overall.value === null
            ? copy.recordTrendNote
            : `${fill(copy.recordTrendLine, {
                from: dateLabel(overall.first.date),
                to: dateLabel(overall.latest.date),
                first: signed(averageProgress(overall.first)),
                latest: signed(averageProgress(overall.latest)),
              })}${overall.qualifying.length === 2 ? ` ${copy.recordProvisional}` : ""}`}
        </p>
        {overall.value !== null && (
          <button type="button" className="rr-text-button rr-personal-share" onClick={() => onCard({ name, session: overall.latest.session, kind: "overall" })}>
            {copy.recordShareOverall}
          </button>
        )}
      </section>

      <label className="rr-detail-session">
        {copy.recordSessionLabel}
        <select value={row.session} onChange={(e) => onSession(e.target.value)}>
          {profile.records.map((r) => (
            <option key={r.session} value={r.session}>
              {dateLabel(r.date)}
            </option>
          ))}
        </select>
      </label>

      <div className={`rr-detail-score ${polarity(row.progress)}`}>
        <strong>{signed(row.progress)}</strong>
        <span>
          {copy.recordProgressLine}
          {place ? ` · ${fill(copy.recordSessionRank, { rank: place })}` : ""}
        </span>
      </div>
      <div className="rr-detail-meta">
        <div>
          <small>{copy.recordLoops}</small>
          <b>
            {loops}/{maxLoops}
          </b>
        </div>
        <div>
          <small>{copy.recordDistance}</small>
          <b>{fixed(loops * loopKm)} km</b>
        </div>
        <div>
          <small>{copy.recordRidge}</small>
          <b>{fixed(row.ridgePoints)}</b>
        </div>
      </div>

      <div className="rr-chart-head">
        <b>{copy.paceTitle}</b>
        <span>{copy.paceNote}</span>
      </div>
      <PaceChart key={row.id} row={row} maxLoops={maxLoops} copy={copy} />

      <table className="rr-lap-table">
        <thead>
          <tr>
            <th scope="col">{copy.lapColLoop}</th>
            <th scope="col">{copy.lapColTime}</th>
            <th scope="col">{copy.lapColPoints}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLoops }, (_, i) => {
            const done = i < row.laps;
            const points = row.lapPoints[i];
            return (
              <tr key={i} className={done ? undefined : "not-completed"}>
                <th scope="row">L{i + 1}</th>
                <td>{done ? row.lapTimes[i] : copy.lapNotRidden}</td>
                <td className={done && i > 0 ? polarity(points) : undefined}>{!done ? "—" : i === 0 ? copy.lapBaseline : signed(points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="rr-detail-note">{copy.recordNote}</p>
      <p className="rr-detail-note">
        <Inline
          text={fill(copy.recordBreakdown, {
            progress: signed(row.progress ?? 0),
            loops,
            spotlight: fixed(row.spotlight),
            adjustment: signed(row.adjustment),
            total: fixed(row.ridgePoints),
          })}
        />
      </p>

      <details className="rr-history">
        <summary>{fill(copy.historyTitle, { count: profile.records.length, points: fixed(profile.totalPoints) })}</summary>
        {profile.records.map((record) => (
          <button key={record.session} type="button" className="rr-history-row" onClick={() => onSession(record.session)}>
            <span>{dateLabel(record.date)}</span>
            <span>{fill(copy.historyLoops, { loops: Math.min(record.laps, maxLoops), max: maxLoops })}</span>
            <span>{fill(copy.historyPoints, { points: fixed(record.ridgePoints) })}</span>
          </button>
        ))}
      </details>

      <button type="button" className="rr-save-card" onClick={() => onCard({ name, session: row.session, kind: "session" })}>
        {copy.cardButton}
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PAGE
// ----------------------------------------------------------------------------
const PROGRAMME = "ridge-repeats"; // lab_programmes.slug of this lab

// ----------------------------------------------------------------------------
// ACCESS WINDOW — Ridge Repeats is for members who registered for it: log in,
// register once, and the board opens. Until then the page stays locked
// behind this window (it cannot be dismissed, only left with "Back to Lab").
// ----------------------------------------------------------------------------
function RidgeAccess({ copy, labCopy, steps, user, registered, onLogin, onRegister, busy, error }) {
  const done = { login: Boolean(user), register: registered, open: registered };
  const note = user ? [copy.noteMemberTitle, copy.noteMemberText] : [copy.noteGuestTitle, copy.noteGuestText];
  return (
    <>
      <Link to="/lab" className="close" aria-label={labCopy.backLabel}>
        ×
      </Link>
      <div className="eyebrow">{labCopy.accessEyebrow}</div>
      <h2 id="rr-access-title">{copy.accessTitle}</h2>
      <p>{copy.accessText}</p>

      <ol className="access-steps">
        {steps.map((step, i) => (
          <li key={step.id} className={done[step.step] ? "done" : undefined}>
            <b>{done[step.step] ? "✓" : String(i + 1).padStart(2, "0")}</b>
            <div>
              <strong>{step.title}</strong>
              <span>{done[step.step] ? labCopy.stepDoneLabel : step.text}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="connection-note">
        <b>{note[0]}</b>
        <p>{note[1]}</p>
      </div>
      {error && <p className="access-error">{error}</p>}

      <div className="modal-actions">
        {user ? (
          <button type="button" className="button purple" onClick={onRegister} disabled={busy}>
            {busy ? labCopy.registeringLabel : labCopy.registerLabel}
          </button>
        ) : (
          <button type="button" className="button purple" onClick={onLogin}>
            {labCopy.loginLabel}
          </button>
        )}
        <Link to="/lab" className="outline">
          {labCopy.backLabel}
        </Link>
      </div>
    </>
  );
}

export default function LabRidge() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildRidgeCopy(settings), [settings]);
  const labCopy = useMemo(() => buildLabCopy(settings), [settings]);

  // Members only: logged in AND registered for Ridge Repeats.
  const { user, loading: sessionLoading } = useSession();
  const { requestLogin } = useAuthGate();
  const accessSteps = useLabAccessSteps();
  const registration = useLabRegistration(user?.id, PROGRAMME);
  const checkingAccess = sessionLoading || registration.loading;
  const locked = !user || !registration.registered || checkingAccess;
  const [registering, setRegistering] = useState(false);
  const [accessError, setAccessError] = useState("");
  const handleRegister = async () => {
    setRegistering(true);
    setAccessError("");
    try {
      await registration.register();
    } catch {
      setAccessError(labCopy.registerError);
    } finally {
      setRegistering(false);
    }
  };
  const images = useSiteImages();
  const joinCommunity = useJoinCommunity();
  const raw = useRidgeFeed(!locked);

  const loopKm = Number(copy.loopKm) > 0 ? Number(copy.loopKm) : 0;
  const maxLoops = Math.max(1, Math.round(Number(copy.maxLoops)) || 1);
  const feed = useMemo(
    () => buildRidgeFeed({ sessions: raw.sessions, results: raw.results, awards: raw.awards, spotlights: raw.spotlights }, maxLoops),
    [raw.sessions, raw.results, raw.awards, raw.spotlights, maxLoops]
  );
  const latest = feed.sessions[0] || null;

  const [mode, setMode] = useState("overall");
  const [sessionSlug, setSessionSlug] = useState("");
  const [spotlightSlug, setSpotlightSlug] = useState("");
  const [chartSlug, setChartSlug] = useState("");
  const [hidden, setHidden] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [record, setRecord] = useState(null); // { name, session }
  const [card, setCard] = useState(null); // { name, session, kind, winners }
  const [story, setStory] = useState(null);
  const [rules, setRules] = useState(false);
  const [about, setAbout] = useState(false);

  const aggregate = mode === "overall" || mode === "alltime";
  const session = feed.sessions.find((s) => s.slug === sessionSlug) || latest;
  const spotlightSession = aggregate ? feed.sessions.find((s) => s.slug === spotlightSlug) || latest : session;
  const rows = useMemo(() => ridgeStandings(feed, mode, session?.slug), [feed, mode, session]);
  const dates = useMemo(() => feed.sessions.slice().reverse(), [feed]);
  const awards = useMemo(() => (spotlightSession ? sessionAwards(feed, spotlightSession.slug) : []), [feed, spotlightSession]);

  const loopsOf = (row) => (aggregate ? row.records.reduce((sum, r) => sum + Math.min(r.laps, maxLoops), 0) : Math.min(row.laps, maxLoops));
  const km = (loops) => fixed(loops * loopKm);
  const totalLoops = rows.reduce((sum, row) => sum + loopsOf(row), 0);

  // -- podium ---------------------------------------------------------------
  const leaders = rows.filter((row) => row.place !== null && row.place <= PODIUM_SIZE && row.value > 0);
  const podiumLabel = { overall: copy.podiumOverall, progress: copy.podiumProgress, points: copy.podiumPoints, alltime: copy.podiumAlltime }[mode];
  const unit = { overall: copy.unitGain, progress: copy.unitProgress, points: copy.unitRidge, alltime: copy.unitAlltime }[mode];
  const signedMode = mode === "overall" || mode === "progress";
  const podiumFoot = (row) => {
    if (mode === "overall")
      return `${fill(copy.footQualifying, { count: row.qualifying.length })} · ${row.qualifying.length === 2 ? copy.footProvisional : copy.footRecorded}`;
    if (mode === "alltime") return fill(copy.footSessions, { count: row.records.length, km: km(loopsOf(row)) });
    return fill(copy.footLoops, { loops: loopsOf(row), max: maxLoops, km: km(loopsOf(row)) });
  };

  // -- journeys (overall only) ---------------------------------------------
  const journeyRows = useMemo(() => {
    if (mode !== "overall") return [];
    const top = rows.filter((row) => row.place && row.place <= PODIUM_SIZE && row.value > 0);
    return top.length ? top : rows.filter((row) => row.value !== null).slice(0, PODIUM_SIZE);
  }, [mode, rows]);
  const series = journeyRows.map((row, i) => ({
    name: row.name,
    value: row.value,
    tone: (i % SERIES_TONES) + 1,
    shape: i % 3,
    hidden: hidden.has(riderKey(row.name)),
    points: trendPoints(feed, row),
  }));
  const chartSession = dates.find((d) => d.slug === chartSlug) || dates[dates.length - 1] || null;
  const toggleSeries = (name) =>
    setHidden((current) => {
      const next = new Set(current);
      const key = riderKey(name);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const heatMax = Math.max(1, ...rows.flatMap((row) => (row.records || []).map(averageProgress).filter((v) => v !== null).map(Math.abs)));

  // -- standings ------------------------------------------------------------
  const query = riderKey(search);
  const listed = rows.filter((row) => riderKey(row.name).includes(query));
  const caption = (row) => {
    if (mode === "overall") {
      if (row.value === null) return row.qualifying.length ? copy.captionBaseline : copy.captionNeedsTwo;
      return fill(copy.captionLatest, { date: dateLabel(row.latest.date), count: row.qualifying.length });
    }
    if (mode === "alltime") return fill(copy.captionAttended, { count: row.records.length });
    if (mode === "progress" && row.value === null) return row.laps < 2 ? copy.captionFirstLoop : copy.captionReview;
    return row.laps >= maxLoops ? copy.captionFinisher : copy.captionView;
  };
  const extraOf = (row) => (mode === "overall" ? row.totalPoints : mode === "progress" ? row.ridgePoints : row.progress);
  const headings = {
    history: mode === "overall" ? copy.colJourney : copy.colLoops,
    metric: mode === "overall" ? copy.colGain : mode === "progress" ? copy.colProgress : copy.colRidge,
    extra: mode === "overall" ? copy.colTotalRidge : mode === "progress" ? copy.colRidge : copy.colProgress,
  };
  const boardTitle = { overall: copy.titleOverall, progress: copy.titleProgress, points: copy.titlePoints, alltime: copy.titleAlltime }[mode];
  const boardNote = { overall: copy.noteOverall, progress: copy.noteProgress, points: copy.notePoints, alltime: copy.noteAlltime }[mode];
  const kicker = aggregate
    ? copy.kickerAll
    : session
      ? `${dateLabel(session.date).toUpperCase()}${session.slug === latest?.slug ? ` · ${copy.kickerLatest}` : ""}`
      : "";
  const summary = `${fill(copy.summary, { riders: rows.length, loops: totalLoops, km: km(totalLoops) })}${
    aggregate ? ` · ${fill(copy.summarySessions, { count: feed.sessions.length })}` : ""
  }`;
  const checked = raw.checkedAt
    ? raw.checkedAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    : "";

  const openRecord = (name, slug) => setRecord({ name, session: slug || (!aggregate && session ? session.slug : "") });
  const heroPhoto = images.ridgeHero ? `url("${images.ridgeHero}")` : "none";

  return (
    <>
    <div className={`rtg-ridge${locked ? " rr-locked" : ""}`} data-mode={mode} style={{ "--rr-hero-photo": heroPhoto }} inert={locked} aria-hidden={locked || undefined}>
      <LabBackdrop className="rr-rtg-background" />

      <header className="rr-brandbar">
        <Link className="rr-brand" to="/lab">
          <span className="rr-brandmark">RTG</span>
          <span>
            {copy.backLabel}
            <small>{copy.title}</small>
          </span>
        </Link>
        <button type="button" className="rr-text-button" onClick={() => setAbout(true)}>
          {copy.aboutButton} <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="rr-intro" aria-labelledby="rr-page-title">
        <div className="rr-intro-copy">
          <p className="rr-eyebrow">{copy.eyebrow}</p>
          <h1 id="rr-page-title">
            {copy.title}
            <span>.</span>
          </h1>
          <p className="rr-intro-line">{copy.introLine}</p>
          <p className="rr-format">{fill(copy.formatLine, { km: loopKm, loops: maxLoops, total: fixed(loopKm * maxLoops) })}</p>
        </div>
        <div className="rr-format-art" aria-hidden="true" style={{ "--rr-loops": maxLoops }}>
          {Array.from({ length: maxLoops }, (_, i) => (
            <span key={i}>{String(i + 1).padStart(2, "0")}</span>
          ))}
          <b>{copy.artCaption}</b>
        </div>
      </section>

      <section className="rr-results" aria-labelledby="rr-board-title">
        <div className="rr-toolbar">
          <div className="rr-mode-buttons" role="group" aria-label={boardTitle}>
            {MODES.map((m) => (
              <button key={m} type="button" aria-pressed={m === mode} onClick={() => setMode(m)}>
                {{ overall: copy.modeOverall, progress: copy.modeProgress, points: copy.modePoints, alltime: copy.modeAlltime }[m]}
              </button>
            ))}
          </div>
          {!aggregate && (
            <label className="rr-session-label">
              {copy.sessionLabel}
              <select value={session?.slug || ""} onChange={(e) => setSessionSlug(e.target.value)}>
                {feed.sessions.length ? (
                  feed.sessions.map((s, i) => (
                    <option key={s.slug} value={s.slug}>
                      {dateLabel(s.date)}
                      {i === 0 ? ` · ${copy.latestTag}` : ""}
                    </option>
                  ))
                ) : (
                  <option value="">{copy.noSessionsLabel}</option>
                )}
              </select>
            </label>
          )}
        </div>

        <div className="rr-board-context">
          <div>
            <p className="rr-eyebrow">{kicker}</p>
            <h2 id="rr-board-title">{boardTitle}</h2>
            <p className="rr-muted" id="rr-summary">
              {summary}
            </p>
          </div>
          <div className="rr-connection">
            <span className={`rr-status ${raw.error ? "failed" : raw.loading ? "" : "connected"}`} role="status" aria-live="polite">
              {raw.loading ? copy.loadingLabel : fill(copy.statusLabel, { time: checked })}
            </span>
            {latest && <button type="button" className="rr-refresh" onClick={() => setStory(spotlightSession?.slug || latest.slug)}>Session story</button>}
            <button type="button" className="rr-refresh" onClick={raw.reload} disabled={raw.loading}>
              <span aria-hidden="true">↻</span> {copy.refreshLabel}
            </button>
          </div>
        </div>
        {raw.error && (
          <p className="rr-error" role="alert">
            {raw.error}
          </p>
        )}

        <div className="rr-podium">
          {leaders.length ? (
            leaders.map((row) => (
              <button key={row.name} type="button" className="rr-podium-card" data-place={row.place} onClick={() => openRecord(row.name, row.session)}>
                <span className="rr-podium-label">
                  <span className="rr-medal">#{row.place}</span>
                  <span>{podiumLabel}</span>
                </span>
                <Avatar name={row.name} photo={row.photo} />
                <span className="rr-podium-name">{row.name}</span>
                <span className="rr-podium-score">
                  <strong>{signedMode ? signed(row.value) : fixed(row.value)}</strong>
                  <small>{unit}</small>
                </span>
                <span className="rr-podium-foot">
                  {!aggregate && <LoopDots count={loopsOf(row)} max={maxLoops} />}
                  <span>{podiumFoot(row)}</span>
                </span>
                {mode === "overall" && (
                  <span className="rr-podium-baseline">
                    {fill(copy.baselineLine, { first: signed(averageProgress(row.first)), latest: signed(averageProgress(row.latest)) })}
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="rr-empty">{mode === "overall" ? copy.podiumEmptyOverall : mode === "progress" ? copy.podiumEmptyProgress : copy.podiumEmptyPoints}</p>
          )}
        </div>

        {mode === "overall" && (
          <section className="rr-overall-graphics" aria-labelledby="rr-trend-title">
            <div className="rr-chart-heading">
              <div>
                <h3 id="rr-trend-title">{copy.journeysTitle}</h3>
                <p className="rr-muted">{copy.journeysText}</p>
              </div>
              <button type="button" className="rr-text-button" onClick={() => setRules(true)}>
                {copy.rulesLink}
              </button>
            </div>
            <div className="rr-trend-legend" role="group" aria-label={copy.journeysTitle}>
              {series.map((s) => (
                <button key={s.name} type="button" aria-pressed={!s.hidden} onClick={() => toggleSeries(s.name)}>
                  <span className={`rr-series-swatch rr-series-${s.tone}`} data-shape={s.shape} aria-hidden="true" />
                  {s.name} <strong>{signed(s.value)}</strong>
                </button>
              ))}
            </div>
            <TrendChart series={series} dates={dates} selected={chartSession?.slug} copy={copy} />
            {chartSession && (
              <div className="rr-chart-detail" aria-live="polite">
                {[
                  dateLabel(chartSession.date),
                  ...series
                    .filter((s) => !s.hidden)
                    .map((s) => {
                      const point = s.points.find((p) => p.session === chartSession.slug);
                      return `${s.name}: ${point && point.value !== null ? `${signed(point.value)} ${copy.unitGain}` : copy.notRecorded}`;
                    }),
                ].join(" · ")}
              </div>
            )}
            <div className="rr-chart-sessions" role="group" aria-label={copy.inspectLabel}>
              {dates.length <= SESSION_BUTTON_LIMIT ? (
                dates.map((d) => (
                  <button key={d.slug} type="button" aria-pressed={d.slug === chartSession?.slug} onClick={() => setChartSlug(d.slug)}>
                    {shortDate(d.date)}
                  </button>
                ))
              ) : (
                <label>
                  {copy.inspectLabel}
                  <select value={chartSession?.slug || ""} onChange={(e) => setChartSlug(e.target.value)}>
                    {dates.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {dateLabel(d.date)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <details className="rr-matrix-details">
              <summary>{copy.heatmapTitle}</summary>
              <p className="rr-muted">{copy.heatmapText}</p>
              <div className="rr-matrix">
                <table className="rr-session-matrix">
                  <thead>
                    <tr>
                      <th scope="col">{copy.heatmapRider}</th>
                      {dates.map((d) => (
                        <th key={d.slug} scope="col">
                          {shortDate(d.date)}
                          <small>{d.date.slice(0, 4)}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name}>
                        <th scope="row">
                          <button type="button" onClick={() => openRecord(row.name)}>
                            {row.name}
                          </button>
                        </th>
                        {dates.map((d) => {
                          const rec = row.records.find((r) => r.session === d.slug);
                          const value = rec ? averageProgress(rec) : null;
                          const text = !rec ? "—" : value !== null ? signed(value) : `L${rec.laps}`;
                          return (
                            <td
                              key={d.slug}
                              className={rec ? polarity(value) : "rr-no-session"}
                              style={{ "--rr-cell-strength": `${Math.round(10 + (Math.abs(value || 0) / heatMax) * 50)}%` }}
                            >
                              {rec ? (
                                <button type="button" onClick={() => openRecord(row.name, d.slug)}>
                                  {text}
                                </button>
                              ) : (
                                <span>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="rr-matrix-key">
                <span>{copy.keyPositive}</span>
                <span>{copy.keyNegative}</span>
                <span>{copy.keyMissing}</span>
              </p>
            </details>
          </section>
        )}

        <div className="rr-list-top">
          <h3>
            {copy.listTitle} <span id="rr-list-count">{query ? `${listed.length} / ${rows.length}` : `(${rows.length})`}</span>
          </h3>
          <label className="rr-search-label">
            <span className="rr-sr-only">{copy.searchPlaceholder}</span>
            <input type="search" placeholder={copy.searchPlaceholder} autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <div className="rr-column-head" aria-hidden="true">
          <span>{copy.colRank}</span>
          <span>{copy.colRider}</span>
          <span>{headings.history}</span>
          <span>{headings.metric}</span>
          {mode !== "alltime" && <span>{headings.extra}</span>}
        </div>
        <div className="rr-rider-list">
          {listed.length ? (
            listed.map((row) => (
              <button key={row.name} type="button" className="rr-rider-row" data-place={row.place || ""} onClick={() => openRecord(row.name, row.session)}>
                <span className="rr-rank">{row.place || "—"}</span>
                <span className="rr-rider-info">
                  <Avatar name={row.name} photo={row.photo} />
                  <span className="rr-rider-copy">
                    <span className="rr-rider-name">{row.name}</span>
                    <span className="rr-rider-caption">{caption(row)}</span>
                  </span>
                </span>
                <span className="rr-rider-loops">
                  {mode === "overall" ? <Sparkline points={trendPoints(feed, row)} /> : mode === "alltime" ? null : <LoopDots count={loopsOf(row)} max={maxLoops} />}
                  <span>
                    {aggregate
                      ? fill(copy.footSessions, { count: row.records.length, km: km(loopsOf(row)) })
                      : `${loopsOf(row)}/${maxLoops} · ${km(loopsOf(row))} km`}
                  </span>
                </span>
                <span className={`rr-row-score ${polarity(row.value)}`}>
                  <strong>{signedMode ? signed(row.value) : fixed(row.value)}</strong>
                  <small>{unit}</small>
                </span>
                {mode !== "alltime" && (
                  <span className="rr-extra-score">
                    {fixed(extraOf(row))}
                    <small>{headings.extra}</small>
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="rr-empty">{raw.loading ? copy.loadingLabel : query ? copy.listNoMatch : copy.listEmpty}</p>
          )}
        </div>
        <p className="rr-board-note">{boardNote}</p>

        {feed.awards.length > 0 && (
          <section className="rr-recognition" aria-labelledby="rr-spotlight-title">
            <div className="rr-spotlight-head">
              <div>
                <p className="rr-eyebrow">{copy.spotlightEyebrow}</p>
                <h3 id="rr-spotlight-title">{copy.spotlightTitle}</h3>
                <p className="rr-muted">
                  {spotlightSession ? `${dateLabel(spotlightSession.date)}${spotlightSession.slug === latest?.slug ? ` · ${copy.spotlightLatest}` : ""}` : ""}
                </p>
              </div>
              {aggregate && feed.sessions.length > 0 && (
                <label className="rr-session-label">
                  {copy.spotlightSessionLabel}
                  <select value={spotlightSession?.slug || ""} onChange={(e) => setSpotlightSlug(e.target.value)}>
                    {feed.sessions.map((s, i) => (
                      <option key={s.slug} value={s.slug}>
                        {dateLabel(s.date)}
                        {i === 0 ? ` · ${copy.latestTag}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="rr-awards" aria-live="polite">
              {spotlightSession && awards.some((a) => a.winners.length) ? (
                awards.map((award, i) => (
                  <article key={award.slug} className="rr-award" data-award={award.tone}>
                    <div className="rr-award-top">
                      <small>{award.name}</small>
                      <span className="rr-award-number" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    {award.winners.length ? (
                      award.winners.map((winner) => (
                        <button key={winner} type="button" className="rr-award-rider" onClick={() => openRecord(winner, spotlightSession.slug)}>
                          <Avatar name={winner} photo={feed.riders.find((p) => riderKey(p.name) === riderKey(winner))?.photo} />
                          <strong>{winner}</strong>
                          <span aria-hidden="true">↗</span>
                        </button>
                      ))
                    ) : (
                      <strong className="rr-award-empty">{copy.awardAwaiting}</strong>
                    )}
                    <p className="rr-award-metric">{award.metric}</p>
                    {award.description && (
                      <details className="rr-award-criteria">
                        <summary>{copy.awardCriteria}</summary>
                        <p>{award.description}</p>
                      </details>
                    )}
                    {award.winners.length > 0 && (
                      <button
                        type="button"
                        className="rr-award-share"
                        onClick={() => setCard({ name: award.winners[0], session: spotlightSession.slug, kind: `spotlight:${award.slug}`, winners: award.winners })}
                      >
                        {copy.awardShare}
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="rr-empty">{copy.spotlightEmpty}</p>
              )}
            </div>
            <p className="rr-board-note">{copy.spotlightNote}</p>
          </section>
        )}
      </section>

      <footer className="rr-footer">
        <p>
          {copy.meetLine}
          <br />
          <span>{copy.meetLine2}</span>
        </p>
        <button type="button" className="rr-text-button" onClick={joinCommunity}>
          {copy.joinLabel} <span aria-hidden="true">↗</span>
        </button>
      </footer>

      <LabDialog open={locked && !checkingAccess} onClose={() => {}} className="access-dialog" labelledBy="rr-access-title">
        <RidgeAccess
          copy={copy}
          labCopy={labCopy}
          steps={accessSteps}
          user={user}
          registered={registration.registered}
          onLogin={() => requestLogin("login")}
          onRegister={handleRegister}
          busy={registering}
          error={accessError}
        />
      </LabDialog>

      <LabDialog open={Boolean(record)} onClose={() => setRecord(null)} scope="rtg-ridge" className="rr-rider-dialog" labelledBy="rr-rider-name">
        <div className="rr-dialog-header">
          <p className="rr-eyebrow">{copy.recordEyebrow}</p>
          <button type="button" className="rr-close" onClick={() => setRecord(null)} aria-label={copy.closeLabel}>
            ×
          </button>
        </div>
        {record && (
          <RiderRecord
            feed={feed}
            name={record.name}
            sessionSlug={record.session}
            onSession={(slug) => setRecord((r) => ({ ...r, session: slug }))}
            copy={copy}
            loopKm={loopKm}
            onCard={(request) => setCard({ winners: [request.name], ...request })}
          />
        )}
      </LabDialog>

      <LabDialog open={rules} onClose={() => setRules(false)} scope="rtg-ridge" className="rr-rules-dialog" labelledBy="rr-rules-title">
        <div className="rr-dialog-header">
          <p className="rr-eyebrow">{copy.rulesEyebrow}</p>
          <button type="button" className="rr-close" onClick={() => setRules(false)} aria-label={copy.closeLabel}>
            ×
          </button>
        </div>
        <h2 id="rr-rules-title">{copy.rulesTitle}</h2>
        <RichText text={copy.rulesIntro} />
        <RulesExample copy={copy} />
        <RichText text={copy.rulesBody} />
        <div className="rr-overall-example">
          <span>
            {copy.overallFirstLabel} <b>{copy.overallFirstValue}</b>
          </span>
          <span>
            {copy.overallLatestLabel} <b>{copy.overallLatestValue}</b>
          </span>
          <strong>{copy.overallResult}</strong>
        </div>
        <RichText text={copy.rulesFoot} paragraphClass="rr-muted" />
      </LabDialog>

      <LabDialog open={about} onClose={() => setAbout(false)} scope="rtg-ridge" className="rr-rules-dialog rr-about-dialog" labelledBy="rr-about-title">
        <div className="rr-dialog-header">
          <p className="rr-eyebrow">{copy.aboutEyebrow}</p>
          <button type="button" className="rr-close" onClick={() => setAbout(false)} aria-label={copy.closeLabel}>
            ×
          </button>
        </div>
        <h2 id="rr-about-title">{copy.aboutTitle}</h2>
        <RichText text={copy.aboutIntro} />
        <div className="rr-about-facts">
          <span>
            <small>{copy.factMeetLabel}</small>
            <b>{copy.factMeetValue}</b>
            <em>{copy.factMeetNote}</em>
          </span>
          <span>
            <small>{copy.factFormatLabel}</small>
            <b>{copy.factFormatValue}</b>
            <em>{copy.factFormatNote}</em>
          </span>
        </div>
        <RichText text={copy.aboutBody} />
        <button
          type="button"
          className="rr-save-card"
          onClick={() => {
            setAbout(false);
            setRules(true);
          }}
        >
          {copy.aboutScoringLabel}
        </button>
      </LabDialog>

      {story && !locked && <RidgeSessionStory feed={feed} sessionSlug={story} onClose={() => setStory(null)} />}
      <RidgeCardMaker request={card} onClose={() => setCard(null)} feed={feed} copy={copy} loopKm={loopKm} />
    </div>

    {/* Outside the board on purpose: the packs wear the Membership look. */}
      <MembershipPlans
        only="ridge"
        heading={{ eyebrow: copy.packsEyebrow, title: copy.packsTitle, accent: copy.packsTitleAccent, text: copy.packsText, linkLabel: copy.packsAllLabel }}
      />
    </>
  );
}

// The worked example of the "How we rank" window: the points of going from
// one loop time to the next, worked out from the two times an admin typed.
function RulesExample({ copy }) {
  const prev = clockToSeconds(copy.examplePrev);
  const next = clockToSeconds(copy.exampleNext);
  const points = prev && next ? ((prev - next) / prev) * 100 : null;
  return (
    <div className="rr-example">
      <span>
        {copy.examplePrev} <small>{copy.examplePrevLabel}</small>
      </span>
      <span aria-hidden="true">→</span>
      <span>
        {copy.exampleNext} <small>{copy.exampleNextLabel}</small>
      </span>
      <strong>
        {signed(points)}
        <small>{copy.examplePointsLabel}</small>
      </strong>
    </div>
  );
}

