import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { createRidgeRequest } from "../../lib/ridge/request";
import {
  buildPublicFeed,
  formatDuration,
  lapDuration,
  scoreEntry,
  sessionSpotlight,
} from "../../lib/ridge/engine";
import ImageUploadField from "../components/ImageUploadField";
import "../../styles/ridge-admin.css";

const TABS = [
  "Riders",
  "Timer",
  "Data",
  "Results",
  "Spotlight",
  "Sessions",
  "Audit",
];
const clock = (ms) =>
  ms == null
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      }).format(new Date(ms));
const inputClock = (ms) =>
  ms == null ? "" : new Date(ms + 19800000).toISOString().slice(0, 23);
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv(rows) {
  return rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(
              typeof v === "string" && /^[=+@\-\t\r]/.test(v)
                ? "'" + v
                : (v ?? ""),
            ).replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}

export default function RidgeAdmin({ requestTransport } = {}) {
  const mounted = useRef(false), readSequence = useRef(0), readController = useRef(null), writeController = useRef(null);
  const inFlight = useRef(false);
  const pendingRequest = useRef(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [recoveryState,setRecoveryState]=useState(null);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(""),
    [tab, setTab] = useState("Riders"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState([]),
    [legacy, setLegacy] = useState(""),
    [editor, setEditor] = useState(null),
    [now, setNow] = useState(Date.now());
  const request = useMemo(() => requestTransport || createRidgeRequest({ getSession: () => supabase.auth.getSession() }), [requestTransport]);
  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current;
    readController.current?.abort();
    const controller = new AbortController(); readController.current = controller;
    try {
      const next = await request(undefined, controller.signal);
      if (!mounted.current || sequence !== readSequence.current) return null;
      setData(next);
      pendingRequest.current=next.recovery?.body || null;
      setRecoveryState(next.recovery || null);setUnconfirmed(Boolean(next.recovery));
      setError("");
      setSessionId(
        (id) =>
          id ||
          next.state.sessions
            .filter((s) => s.mode !== "archived")
            .sort((a, b) => b.date.localeCompare(a.date))[0]?.id ||
          "",
      );
      return next;
    } catch (e) {
      if (mounted.current && sequence === readSequence.current && e.code !== 'ridge_cancelled') setError(e.message);
      return null;
    }
  }, [request]);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => { mounted.current = false; ++readSequence.current; readController.current?.abort(); writeController.current?.abort(); clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    const warn = event => { if (pendingRequest.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const state = data?.state,
    session = state?.sessions.find((s) => s.id === sessionId);
  useEffect(() => {
    setSelected(session?.entries.map((e) => e.riderId) || []);
    setEditor(null);
  }, [sessionId, data?.version]);
  const send = async (command, retry = false) => {
    if (inFlight.current || !data) return false;
    if ((pendingRequest.current || recoveryState) && !retry) {
      setError("An earlier action is unconfirmed. Retry that same action before making another change."); return false;
    }
    const body = retry ? pendingRequest.current : {
      version: data.version, requestId: crypto.randomUUID(), command: { sessionId, ...command },
    };
    if (!body) return false;
    pendingRequest.current = body;
    ++readSequence.current; readController.current?.abort();
    const controller = new AbortController(); writeController.current = controller;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await request(body, controller.signal, {retry});
      if (!mounted.current) return false;
      pendingRequest.current = null; setUnconfirmed(false);setRecoveryState(null);
      const refreshed = await refresh();
      if (!mounted.current) return false;
      setMessage(refreshed ? "Saved. Website results and the audit log are up to date." : "Saved on the server. Refresh to see the updated records.");
      setEditor(null); return true;
    } catch (e) {
      if (!mounted.current) return false;
      // Reuse the exact request ID, version and command after uncertain network
      // failure; never turn a retry into a second timing event or correction.
      if (!e.uncertain) { pendingRequest.current = null; setUnconfirmed(false);setRecoveryState(null); }
      else {setUnconfirmed(true);setRecoveryState({reviewed:false});}
      setError(e.message); return false;
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const riders = useMemo(
    () =>
      state?.riders
        .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)) || [],
    [state, search],
  );
  const awards = useMemo(
    () => (session && state ? sessionSpotlight(state, session) : []),
    [state, session],
  );
  const feed = useMemo(() => (state ? buildPublicFeed(state) : null), [state]);
  const riderName = (id) =>
    state?.riders.find((r) => r.id === id)?.name || "Unknown rider";
  const beginEdit = (entry, lap) =>
    setEditor({
      type: "lap",
      riderId: entry.riderId,
      lap: lap + 1,
      mode: "duration",
      duration: formatDuration(lapDuration(entry.laps[lap])),
      start: inputClock(entry.laps[lap]?.start),
      end: inputClock(entry.laps[lap]?.end),
      reason: "",
      points: entry.laps[lap]?.pointsOverride ?? "",
      adjustment: entry.adjustment || 0,
    });
  const field = (key, value) => setEditor((e) => ({ ...e, [key]: value }));
  const submitEditor = (e) => {
    e.preventDefault();
    if (editor.type === "rider")
      send({
        type: "edit_rider",
        riderId: editor.id,
        name: editor.name,
        photo:
          editor.photo === state.riders.find((r) => r.id === editor.id)?.photo
            ? undefined
            : editor.photo,
        reason: editor.reason,
      });
    else if (editor.type === "award")
      send({
        type: "award_override",
        award: editor.award,
        riderIds: editor.riderIds,
        metric: editor.metric,
        reason: editor.reason,
        reset: editor.reset,
      });
    else if (editor.mode === "points")
      send({
        type: "correct_points",
        riderId: editor.riderId,
        lap: editor.lap,
        points: editor.points,
        adjustment: editor.adjustment,
        reason: editor.reason,
      });
    else
      send({
        type: "correct_lap",
        riderId: editor.riderId,
        lap: editor.lap,
        mode: editor.mode,
        duration: editor.duration,
        start: editor.start ? editor.start + "+05:30" : null,
        end: editor.end ? editor.end + "+05:30" : null,
        reason: editor.reason,
      });
  };
  return (
    <div className="ridge-admin">
      <header className="ra-heading">
        <div>
          <p className="ra-eyebrow">RTG ADMIN · RIDGE REPEATS</p>
          <h1>Run your session.</h1>
          <p>Riders, timing, corrections and published results in one place.</p>
        </div>
        <Link to="/lab/ridge" target="_blank">
          View leaderboard ↗
        </Link>
      </header>
      {unconfirmed && <div role="status"><p>{recoveryState?.expired?'Recovery expired after 30 minutes; command details were cleared. Review current records and audit before entering a new action.':'The last action is not confirmed. This login can recover it after navigating away and back within this tab, for up to 30 minutes.'}</p>{!recoveryState?.expired&&<button type="button" disabled={busy} onClick={() => send(null, true)}>Retry unconfirmed action</button>}<button type="button" disabled={busy||!recoveryState?.reviewed} onClick={()=>{try{request.clearRecovery?.();pendingRequest.current=null;setRecoveryState(null);setUnconfirmed(false);setMessage('Recovery reminder cleared after your review. No action was sent.');}catch(e){setError(e.message);}}}>I reviewed current records and audit; clear reminder</button></div>}
        {error && (
        <div className="ra-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="ra-success" role="status">
          {message}
        </div>
      )}
      {!data ? (
        <button onClick={refresh}>Retry loading Ridge</button>
      ) : (
        <>
          <section className="ra-toolbar">
            <label>
              Session
              <select
                value={sessionId}
                disabled={busy || unconfirmed}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Choose a session</option>
                {state.sessions
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} · {s.mode}
                      {s.finished ? " · finished" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <span className={`ra-badge ${session?.mode}`}>
              {session
                ? `${session.mode.toUpperCase()} · ${session.finished ? "TIMING LOCKED" : "OPEN"}`
                : "NO SESSION"}
            </span>
            <button disabled={busy} onClick={refresh}>
              Refresh records
            </button>
            <button
              onClick={() =>
                download(
                  "rtg-ridge-snapshot.json",
                  JSON.stringify(data, null, 2),
                )
              }
            >
              Export data snapshot
            </button>
          </section>
          <nav className="ra-tabs" aria-label="Ridge administration">
            {TABS.map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => {
                  setTab(t);
                  setEditor(null);
                  if (t === "Riders")
                    setSelected(session?.entries.map((e) => e.riderId) || []);
                }}
              >
                {t}
              </button>
            ))}
          </nav>
          {editor && (
            <form className="ra-editor" onSubmit={submitEditor}>
              <h2>
                {editor.type === "rider"
                  ? "Edit rider"
                  : editor.type === "award"
                    ? "Correct Spotlight"
                    : `${riderName(editor.riderId)} · Lap ${editor.lap}`}
              </h2>
              {editor.type === "rider" ? (
                <>
                  <label>
                    Rider name
                    <input
                      value={editor.name}
                      onChange={(e) => field("name", e.target.value)}
                      required
                      maxLength={100}
                    />
                  </label>
                  <ImageUploadField
                    label="Rider photo"
                    accept="image/*"
                    folder="ridge-riders"
                    value={editor.photo}
                    onChange={(v) => field("photo", v)}
                  />
                </>
              ) : editor.type === "award" ? (
                <>
                  <label>
                    Winners
                    <select
                      multiple
                      value={editor.riderIds}
                      onChange={(e) =>
                        field(
                          "riderIds",
                          Array.from(e.target.selectedOptions, (o) => o.value),
                        )
                      }
                    >
                      {session.entries
                        .filter((e) => scoreEntry(e).completed)
                        .map((e) => (
                          <option value={e.riderId} key={e.riderId}>
                            {riderName(e.riderId)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Result label
                    <input
                      value={editor.metric}
                      onChange={(e) => field("metric", e.target.value)}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!editor.reset}
                      onChange={(e) => field("reset", e.target.checked)}
                    />{" "}
                    Restore automatic selection
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Correction type
                    <select
                      value={editor.mode}
                      onChange={(e) => field("mode", e.target.value)}
                    >
                      <option value="duration">Correct lap duration</option>
                      <option value="timestamps">
                        Correct start and finish (IST)
                      </option>
                      <option value="points">
                        Published points / organiser adjustment
                      </option>
                    </select>
                  </label>
                  {editor.mode === "duration" ? (
                    <label>
                      Duration · mm:ss.mmm
                      <input
                        required
                        value={editor.duration}
                        onChange={(e) => field("duration", e.target.value)}
                      />
                    </label>
                  ) : editor.mode === "timestamps" ? (
                    <>
                      <label>
                        Start · IST
                        <input
                          type="datetime-local"
                          step="0.001"
                          required
                          value={editor.start}
                          onChange={(e) => field("start", e.target.value)}
                        />
                      </label>
                      <label>
                        Finish · IST
                        <input
                          type="datetime-local"
                          step="0.001"
                          required
                          value={editor.end}
                          onChange={(e) => field("end", e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Comparison points (blank recalculates)
                        <input
                          type="number"
                          step="0.01"
                          value={editor.points}
                          disabled={editor.lap === 1}
                          onChange={(e) => field("points", e.target.value)}
                        />
                      </label>
                      <label>
                        Organiser adjustment
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editor.adjustment}
                          onChange={(e) => field("adjustment", e.target.value)}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              <label>
                Reason
                <input
                  required
                  maxLength={500}
                  value={editor.reason}
                  onChange={(e) => field("reason", e.target.value)}
                  placeholder="Why is this being changed?"
                />
              </label>
              <div className="ra-actions">
                <button className="primary" disabled={busy}>
                  Save and recalculate
                </button>
                <button type="button" onClick={() => setEditor(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {tab === "Riders" && (
            <section className="ra-panel">
              <div className="ra-section-title">
                <div>
                  <h2>Rider roster & attendance</h2>
                  <p>
                    {state.riders.length} riders ·{" "}
                    {session?.entries.length || 0} attending this session
                  </p>
                </div>
                <input
                  aria-label="Find rider"
                  placeholder="Find a rider"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <form
                className="ra-inline"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  const name = new FormData(f).get("name");
                  if (await send({ type: "create_rider", name })) f.reset();
                }}
              >
                <input
                  name="name"
                  aria-label="New rider name"
                  placeholder="New rider’s name"
                  required
                  maxLength={100}
                />
                <button disabled={busy}>Add rider</button>
              </form>
              <div className="ra-roster">
                {riders.map((r) => (
                  <article key={r.id}>
                    <label>
                      <input
                        type="checkbox"
                        disabled={
                          !session ||
                          session.finished ||
                          session.mode === "archived"
                        }
                        checked={selected.includes(r.id)}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, r.id]
                              : ids.filter((id) => id !== r.id),
                          )
                        }
                      />
                      {r.photo && <img alt="" src={r.photo} />}
                      <span>{r.name}</span>
                    </label>
                    <button
                      onClick={() =>
                        setEditor({
                          type: "rider",
                          ...r,
                          photo: r.photo || "",
                          reason: "",
                        })
                      }
                    >
                      Name / photo
                    </button>
                  </article>
                ))}
              </div>
              <button
                className="primary"
                disabled={!session || session.finished || busy}
                onClick={() => send({ type: "attendance", riderIds: selected })}
              >
                Save attendance
              </button>
            </section>
          )}
          {tab === "Timer" && (
            <section className="ra-panel">
              <div className="ra-section-title">
                <div>
                  <h2>Lap timing</h2>
                  <p>
                    Tap time is captured immediately. Wait for “Saved” to
                    confirm it reached the server.
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !session ||
                    session.finished ||
                    !session.entries.length ||
                    session.entries.some((e) => e.laps.length)
                  }
                  onClick={() => send({ type: "group_start", at: Date.now() })}
                >
                  Start all · Lap 1
                </button>
              </div>
              <div className="ra-timers">
                {session?.entries.map((entry) => {
                  const rider = state.riders.find(
                    (r) => r.id === entry.riderId,
                  );
                  let i = entry.laps.findIndex((l) => !lapDuration(l));
                  if (i < 0) i = entry.laps.length;
                  const lap = entry.laps[i],
                    running = lap?.start != null && !lapDuration(lap);
                  return (
                    <article key={entry.riderId}>
                      <div className="ra-section-title">
                        <h3>{rider?.name}</h3>
                        <span>
                          {i >= 5
                            ? "5 loops complete"
                            : `Lap ${i + 1} · ${running ? "running" : "ready"}`}
                        </span>
                      </div>
                      <div className="ra-clock">
                        {running
                          ? formatDuration(now - lap.start) || "0:00.000"
                          : formatDuration(lapDuration(entry.laps.at(-1))) ||
                            "0:00.000"}
                      </div>
                      <p>
                        {entry.laps
                          .filter((l) => lapDuration(l))
                          .map(
                            (l, j) =>
                              `L${j + 1} ${formatDuration(lapDuration(l))}`,
                          )
                          .join(" · ") || "No completed laps"}
                      </p>
                      <div className="ra-actions">
                        {i < 5 &&
                          (!running ? (
                            <button
                              className="primary"
                              disabled={
                                busy ||
                                session.finished ||
                                session.mode === "archived"
                              }
                              onClick={() =>
                                send({
                                  type: "start",
                                  riderId: entry.riderId,
                                  lap: i + 1,
                                  at: Date.now(),
                                })
                              }
                            >
                              Start L{i + 1}
                            </button>
                          ) : (
                            <>
                              <button
                                className="primary"
                                disabled={
                                  busy ||
                                  session.finished ||
                                  session.mode === "archived"
                                }
                                onClick={() =>
                                  send({
                                    type: "end",
                                    riderId: entry.riderId,
                                    lap: i + 1,
                                    at: Date.now(),
                                  })
                                }
                              >
                                Finish L{i + 1}
                              </button>
                              {i < 4 && (
                                <button
                                  disabled={
                                    busy ||
                                    session.finished ||
                                    session.mode === "archived"
                                  }
                                  onClick={() =>
                                    send({
                                      type: "pass",
                                      riderId: entry.riderId,
                                      lap: i + 1,
                                      at: Date.now(),
                                    })
                                  }
                                >
                                  Pass → L{i + 2}
                                </button>
                              )}
                            </>
                          ))}
                      </div>
                    </article>
                  );
                })}
              </div>
              {!session?.entries.length && (
                <p>Choose a session and save attendance to start timing.</p>
              )}
            </section>
          )}
          {tab === "Data" && (
            <section className="ra-panel">
              <h2>Timing records</h2>
              <p>
                All clock timestamps use IST. Duration corrections preserve the
                original captured timestamps.
              </p>
              <div className="ra-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Lap</th>
                      <th>Start · IST</th>
                      <th>Finish · IST</th>
                      <th>Captured time</th>
                      <th>Official time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {session?.entries.flatMap((entry) =>
                      Array.from({ length: 5 }, (_, i) => {
                        const lap = entry.laps[i] || {};
                        return (
                          <tr key={`${entry.riderId}:${i}`}>
                            <th>{riderName(entry.riderId)}</th>
                            <td>L{i + 1}</td>
                            <td>{clock(lap.start)}</td>
                            <td>{clock(lap.end)}</td>
                            <td>
                              {formatDuration(
                                lap.end != null ? lap.end - lap.start : null,
                              ) || "—"}
                            </td>
                            <td>{formatDuration(lapDuration(lap)) || "—"}</td>
                            <td>
                              <button
                                disabled={busy}
                                onClick={() => beginEdit(entry, i)}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Results" && (
            <section className="ra-panel">
              <div className="ra-section-title">
                <div>
                  <h2>Session results</h2>
                  <p>
                    Five completed loops qualify for official weekly
                    classification. Partial rides retain trial progress.
                  </p>
                </div>
                <button
                  disabled={!session}
                  onClick={() =>
                    download(
                      `ridge-${session.date}.csv`,
                      csv([
                        [
                          "Rider",
                          "Laps",
                          "Progress",
                          "Spotlight",
                          "Adjustment",
                          "Total",
                        ],
                        ...session.entries.map((e) => {
                          const r = scoreEntry(e),
                            bonus = awards.some((a) =>
                              a.winners.includes(riderName(e.riderId)),
                            )
                              ? 1
                              : 0;
                          return [
                            riderName(e.riderId),
                            r.completed,
                            r.progress,
                            bonus,
                            r.adjustment,
                            r.trial + bonus + r.adjustment,
                          ];
                        }),
                      ]),
                      "text/csv",
                    )
                  }
                >
                  Export CSV
                </button>
              </div>
              <div className="ra-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Laps</th>
                      <th>Progress</th>
                      <th>Spotlight</th>
                      <th>Adjustment</th>
                      <th>Total</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session?.entries.map((e) => {
                      const r = scoreEntry(e),
                        bonus = awards.some((a) =>
                          a.winners.includes(riderName(e.riderId)),
                        )
                          ? 1
                          : 0;
                      return (
                        <tr key={e.riderId}>
                          <th>{riderName(e.riderId)}</th>
                          <td>{r.completed}</td>
                          <td>{r.progress.toFixed(2)}</td>
                          <td>{bonus}</td>
                          <td>{r.adjustment.toFixed(2)}</td>
                          <td>{(r.trial + bonus + r.adjustment).toFixed(2)}</td>
                          <td>
                            {r.completed === 5 ? "Official" : "Trial progress"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p>
                {feed?.results.length || 0} published rider-session records
                across {feed?.sessions.length || 0} sessions.
              </p>
            </section>
          )}
          {tab === "Spotlight" && (
            <section className="ra-panel">
              <h2>Six ways to shine</h2>
              <p>
                Categories are awarded in order. Each rider receives at most one
                Spotlight per session.
              </p>
              <div className="ra-timers">
                {awards.map((a) => (
                  <article key={a.id}>
                    <p className="ra-eyebrow">{a.criterion}</p>
                    <h3>{a.title}</h3>
                    <strong>
                      {a.winners.join(" / ") || "No eligible rider"}
                    </strong>
                    <p>{a.metric}</p>
                    <p>{a.description}</p>
                    <button
                      onClick={() =>
                        setEditor({
                          type: "award",
                          award: a.id,
                          riderIds: state.riders
                            .filter((r) => a.winners.includes(r.name))
                            .map((r) => r.id),
                          metric: a.metric,
                          reason: "",
                          reset: false,
                        })
                      }
                    >
                      Correct winner
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === "Sessions" && (
            <section className="ra-panel">
              <h2>Session controls</h2>
              <form
                className="ra-inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  send({
                    type: "create_session",
                    date: new FormData(e.currentTarget).get("date"),
                  });
                }}
              >
                <label>
                  New session date
                  <input name="date" type="date" required />
                </label>
                <button className="primary" disabled={busy}>
                  Create testing session
                </button>
              </form>
              <p>
                Testing sessions remain in the admin panel. Publish a session to
                show its results on the website.
              </p>
              {session && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget),
                      action = f.get("action");
                    send(
                      action === "live" ||
                        action === "testing" ||
                        action === "archived"
                        ? {
                            type: "session_mode",
                            mode: action,
                            reason: f.get("reason"),
                          }
                        : { type: action, reason: f.get("reason") },
                    );
                  }}
                >
                  <label>
                    Action
                    <select name="action">
                      <option value="live">Publish results</option>
                      <option value="testing">Unpublish / testing</option>
                      <option value="finish_session">
                        Finish session and lock timing
                      </option>
                      <option value="reopen_session">Reopen timing</option>
                      <option value="archived">
                        Archive (keep all records)
                      </option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required maxLength={500} />
                  </label>
                  <button disabled={busy}>Apply session change</button>
                </form>
              )}
            </section>
          )}
          {tab === "Audit" && (
            <section className="ra-panel">
              <h2>Audit trail</h2>
              <label>
                Imported Google records
                <select
                  value={legacy}
                  onChange={(e) => setLegacy(e.target.value)}
                >
                  <option value="">Choose original records</option>
                  {Object.keys(state.legacyRecords || {}).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              {legacy && state.legacyRecords?.[legacy] && (
                <details open>
                  <summary>{legacy} · original records retained</summary>
                  <button
                    onClick={() =>
                      download(
                        `ridge-legacy-${legacy.replaceAll(" ", "-")}.json`,
                        JSON.stringify(state.legacyRecords[legacy], null, 2),
                      )
                    }
                  >
                    Download original records
                  </button>
                  <div className="ra-table">
                    <table>
                      <thead>
                        <tr>
                          {state.legacyRecords[legacy].values[0]?.map(
                            (v, i) => (
                              <th key={i}>{v}</th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {state.legacyRecords[legacy].values
                          .slice(1)
                          .map((row, i) => (
                            <tr key={i}>
                              {row.map((v, j) => (
                                <td key={j}>
                                  <span className="ra-legacy-cell">
                                    {String(v ?? "")}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <p>
                Latest 100 actions. Original lap values and correction reasons
                remain recorded.
              </p>
              <div className="ra-table">
                <table>
                  <thead>
                    <tr>
                      <th>Saved · IST</th>
                      <th>Action</th>
                      <th>Rider / session</th>
                      <th>Reason / details</th>
                      <th>Admin ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((a) => (
                      <tr key={a.id}>
                        <td>{clock(Date.parse(a.created_at))}</td>
                        <td>{a.action}</td>
                        <td>
                          {a.details.riderId
                            ? riderName(a.details.riderId)
                            : state.sessions.find(
                                (s) => s.id === a.details.sessionId,
                              )?.date || "Roster"}
                        </td>
                        <td>
                          <details>
                            <summary>
                              {a.details.detail?.reason || "View saved action"}
                            </summary>
                            <pre>{JSON.stringify(a.details, null, 2)}</pre>
                          </details>
                        </td>
                        <td>{a.actor_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}


