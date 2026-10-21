// Native Ridge domain rules. Published historical points remain explicit overrides.
export const emptyRidgeState = () => ({
  schemaVersion: 1,
  riders: [],
  sessions: [],
});
export const keyOf = (v) =>
  String(v || "")
    .trim()
    .toLocaleLowerCase();
export const round2 = (n) => Math.round(n * 100) / 100;
export function parseDuration(text) {
  const m = /^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(String(text || "").trim());
  if (!m) throw new Error("Use minutes:seconds, for example 21:09.250.");
  const ms =
    Number(m[1]) * 60000 +
    Number(m[2]) * 1000 +
    Number((m[3] || "").padEnd(3, "0"));
  if (!Number.isSafeInteger(ms) || ms <= 0 || ms > 86400000)
    throw new Error("Lap duration must be between zero and 24 hours.");
  return ms;
}
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const n = Math.round(ms);
  return `${Math.floor(n / 60000)}:${String(Math.floor((n % 60000) / 1000)).padStart(2, "0")}.${String(n % 1000).padStart(3, "0")}`;
}
export const lapDuration = (lap) =>
  lap?.durationMs ??
  (lap?.start != null && lap?.end != null ? lap.end - lap.start : null);
export const istDate = (ms) =>
  new Date(ms + 19800000).toISOString().slice(0, 10);
function dateOnly(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value || "") ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid session date.");
  return value;
}
function nameOf(value) {
  const s = String(value || "").trim();
  if (!s || s.length > 100)
    throw new Error("Enter a rider name of 1–100 characters.");
  return s;
}
function reasonOf(value) {
  const s = String(value || "").trim();
  if (!s || s.length > 500)
    throw new Error("Enter a correction reason of 1–500 characters.");
  return s;
}
function photoOf(value) {
  const s = String(value || "");
  if (s && (!s.startsWith("https://") || s.length > 2048))
    throw new Error("Use an uploaded HTTPS photo URL.");
  return s;
}
function finite(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > 100000)
    throw new Error("Enter a valid points value.");
  return round2(n);
}
// A historical snapshot is separate from native pointsOverride: null there
// intentionally resets to calculated points, while official null means unknown.
function officialScoreOf(entry) {
  const score = entry.officialScore;
  if (!score) return null;
  if (score.version !== 1 || !Array.isArray(score.lapPoints) || score.lapPoints.length !== 5 || score.lapPoints[0] !== null ||
      !score.lapPoints.every(p => p === null || Number.isFinite(p)) ||
      !(score.improvement === null || Number.isFinite(score.improvement)) ||
      !Number.isInteger(score.completedLaps) || score.completedLaps < 0 || score.completedLaps > 5 ||
      !Number.isFinite(score.highlightScore) || !Number.isFinite(score.totalScore) || !score.provenance?.snapshotId)
    throw new Error("Invalid authoritative historical score snapshot.");
  if (score.improvement !== null && Math.abs(score.totalScore - score.improvement - score.completedLaps - score.highlightScore) > 0.011 + Number.EPSILON * 100)
    throw new Error("Authoritative historical total does not reconcile.");
  return score;
}
export function scoreEntry(entry) {
  const official = officialScoreOf(entry);
  const times = official ? Array.from({length: 5}, (_, i) => lapDuration(entry.laps?.[i])) : (entry.laps || []).map(lapDuration);
  if (official) return {
    times, points: [...official.lapPoints], completed: official.completedLaps,
    progress: official.improvement, trial: official.improvement === null ? null : round2(official.improvement + official.completedLaps),
    adjustment: 0, highlightScore: official.highlightScore, totalScore: official.totalScore,
    scoreSource: "official-published", provenance: official.provenance,
  };
  const completed = times.filter(n => Number.isFinite(n) && n > 0).length;
  const points = times.map((ms, i) => i === 0 ? null :
    Number.isFinite(entry.laps[i]?.pointsOverride) ? entry.laps[i].pointsOverride :
    !ms || !times[i - 1] ? null : round2(((times[i - 1] - ms) / times[i - 1]) * 100));
  const progress = round2(points.reduce((sum, p) => sum + (p || 0), 0));
  return { times, points, completed, progress, trial: round2(progress + completed), adjustment: entry.adjustment || 0,
    scoreSource: "native-calculated" };
}
export function sessionSpotlight(state, session) {
  const rows = [],
    times = {};
  const date = session.date.split("-").reverse().join("-");
  for (const entry of session.entries) {
    const rider = state.riders.find((r) => r.id === entry.riderId),
      score = scoreEntry(entry);
    if (!rider || !score.completed) continue;
    rows.push([
      date,
      rider.name,
      formatDuration(score.times[0]),
      ...Array.from({ length: 4 }, (_, i) => score.points[i + 1] ?? ""),
      score.progress,
      score.completed,
    ]);
    times[date + "|" + keyOf(rider.name)] = score.times.map(formatDuration);
  }
  const corrections = {
    spotlights: (session.awardOverrides || []).map((a) => ({
      date,
      award: a.id,
      winners: a.riderIds
        .map((id) => state.riders.find((r) => r.id === id)?.name)
        .filter(Boolean),
      metric: a.metric,
    })),
  };
  return selectSpotlight(date, rows, times, corrections);
}
export function buildPublicFeed(state) {
  const feed = { sessions: [], results: [], awards: [], spotlights: [] };
  const photosIncluded = new Set();
  for (const session of state.sessions
    .filter((s) => s.mode === "live")
    .sort((a, b) => b.date.localeCompare(a.date))) {
    const awards = sessionSpotlight(state, session);
    feed.sessions.push({
      id: session.id,
      slug: session.id,
      name: "Ridge Repeats · " + session.date,
      session_date: session.date,
      award_definitions: awards.map(({id,title,criterion,description,winners,metric}) => ({id,title,criterion,description,winners:[...winners],metric})),
      published: true,
    });
    if (!feed.awards.length)
      feed.awards = awards.map((a, i) => ({
        id: a.id,
        slug: a.id,
        name: a.title,
        description: a.description,
        tone: a.id,
        sort_order: i,
        published: true,
      }));
    for (const entry of session.entries) {
      const rider = state.riders.find((r) => r.id === entry.riderId),
        score = scoreEntry(entry);
      if (!rider || (!score.completed && score.scoreSource !== "official-published")) continue;
      const bonus = score.highlightScore ?? (awards.some((a) =>
        a.winners.some((n) => keyOf(n) === keyOf(rider.name)),
      )
        ? 1
        : 0);
      feed.results.push({
        id: session.id + ":" + rider.id,
        session_slug: session.id,
        athlete_name: rider.name,
        athlete_id: rider.id,
        session_date: session.date,
        improvement: score.progress,
        highlight_score: bonus,
        score_source: score.scoreSource,
        total_score: score.totalScore ?? round2(score.progress + score.completed + bonus + score.adjustment),
        // Provenance belongs to private workspace/audit only. Every native
        // mutation regenerates this allowlisted display projection.
        loop_times: score.times.map(formatDuration).join(","),
        lap_points: score.points,
        completed_laps: score.completed,
        progress_points: score.progress,
        spotlight_points: bonus,
        adjustment_points: score.adjustment,
        photo_url: photosIncluded.has(rider.id) ? "" : rider.photo || "",
        published: true,
      });
      photosIncluded.add(rider.id);
    }
    awards.forEach((a, i) =>
      a.winners.forEach((name) =>
        feed.spotlights.push({
          id: `${session.id}:${a.id}:${name}`,
          session_slug: session.id,
          award_slug: a.id,
          athlete_name: name,
          metric: a.metric,
          sort_order: i,
          published: true,
        }),
      ),
    );
  }
  return feed;
}

// Every mutation runs on the server, then a database compare-and-swap commits
// state, the published feed and an audit record together. No browser scores are trusted.
export function applyRidgeCommand(
  previous,
  command,
  { now = Date.now(), newId = () => crypto.randomUUID() } = {},
) {
  const state = structuredClone(previous);
  const { type, sessionId, riderId } = command || {};
  let detail = {};
  if (type === "create_rider") {
    const name = nameOf(command.name);
    if (state.riders.some((r) => keyOf(r.name) === keyOf(name)))
      throw new Error("That rider already exists.");
    state.riders.push({ id: newId(), name, photo: "" });
  } else if (type === "edit_rider") {
    const rider = state.riders.find((r) => r.id === riderId);
    if (!rider) throw new Error("Rider not found.");
    const name = nameOf(command.name);
    if (
      state.riders.some(
        (r) => r.id !== riderId && keyOf(r.name) === keyOf(name),
      )
    )
      throw new Error("That name belongs to another rider.");
    detail = { before: { ...rider }, reason: reasonOf(command.reason) };
    rider.name = name;
    if (command.photo !== undefined) rider.photo = photoOf(command.photo);
  } else if (type === "create_session") {
    const date = dateOnly(command.date);
    if (state.sessions.some((s) => s.date === date && s.mode !== "archived"))
      throw new Error("A session already exists for that date.");
    state.sessions.push({
      id: newId(),
      date,
      mode: "testing",
      finished: false,
      entries: [],
      awardOverrides: [],
    });
  } else {
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("Session not found.");
    const entry = session.entries.find((e) => e.riderId === riderId);
    if (type === "attendance") {
      if (session.finished || session.mode === "archived")
        throw new Error("Reopen the session to change attendance.");
      if (!Array.isArray(command.riderIds))
        throw new Error("Choose riders for attendance.");
      const selected = new Set(command.riderIds);
      if ([...selected].some((id) => !state.riders.some((r) => r.id === id)))
        throw new Error("Unknown rider in attendance.");
      if (
        session.entries.some(
          (e) =>
            !selected.has(e.riderId) &&
            (e.officialScore || e.laps.some((l) => l.start != null || lapDuration(l))),
        )
      )
        throw new Error("A rider with recorded timing cannot be removed.");
      session.entries = [...selected].map(
        (id) =>
          session.entries.find((e) => e.riderId === id) || {
            riderId: id,
            laps: [],
            adjustment: 0,
          },
      );
    } else if (type === "session_mode") {
      if (!["live", "testing", "archived"].includes(command.mode))
        throw new Error("Invalid session mode.");
      if (command.mode === "live" && session.mode !== "live" &&
          session.entries.some(e => e.laps.some(l => l.start != null || l.end != null || l.durationMs != null) || e.officialScore))
        throw new Error("This session has test recordings. Archive it and create a clean live session.");
      detail = { before: session.mode, reason: reasonOf(command.reason) };
      session.mode = command.mode;
    } else if (type === "finish_session" || type === "reopen_session") {
      detail.reason = reasonOf(command.reason);
      session.finished = type === "finish_session";
    } else if (type === "award_override") {
      if (session.entries.some(e => e.officialScore)) throw new Error("Historical awards require an explicitly accepted source revision before correction.");
      detail.reason = reasonOf(command.reason);
      if (
        ![
          "leader",
          "endurance",
          "fastest",
          "improvement",
          "finish",
          "consistent",
        ].includes(command.award)
      )
        throw new Error("Unknown award.");
      if (
        !Array.isArray(command.riderIds) ||
        command.riderIds.some(
          (id) =>
            !session.entries.some(
              (e) => e.riderId === id && scoreEntry(e).completed,
            ),
        )
      )
        throw new Error("Choose riders with results in this session.");
      detail.before = structuredClone(session.awardOverrides);
      session.awardOverrides = session.awardOverrides.filter(
        (a) => a.id !== command.award,
      );
      if (!command.reset)
        session.awardOverrides.push({
          id: command.award,
          riderIds: [...new Set(command.riderIds)],
          metric: String(command.metric || "").slice(0, 200),
        });
    } else if (type === "correct_lap" || type === "correct_points") {
      if (!entry) throw new Error("Rider not present.");
      if (entry.officialScore) throw new Error("Historical published scores require an explicitly accepted source revision before correction.");
      detail.reason = reasonOf(command.reason);
      const i = Number(command.lap) - 1;
      if (!Number.isInteger(i) || i < 0 || i >= 5)
        throw new Error("Choose lap 1–5.");
      if (i > 0 && !lapDuration(entry.laps[i - 1]))
        throw new Error("Recover the previous lap first.");
      const lap = entry.laps[i] || {};
      detail.before = { ...lap, adjustment: entry.adjustment || 0 };
      if (type === "correct_points") {
        if (!lapDuration(lap))
          throw new Error("Record the lap duration first.");
        if (i > 0)
          lap.pointsOverride =
            command.points === "" ? null : finite(command.points);
        entry.adjustment = finite(command.adjustment ?? entry.adjustment ?? 0);
      } else {
        if (command.mode === "timestamps") {
          const start = Date.parse(command.start),
            end = Date.parse(command.end);
          if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end <= start ||
            istDate(start) !== session.date ||
            istDate(end) !== session.date
          )
            throw new Error(
              "Start and finish must be ordered and on the session date in IST.",
            );
          if (entry.laps[i - 1]?.end > start || entry.laps[i + 1]?.start < end)
            throw new Error("The correction overlaps an adjacent lap.");
          Object.assign(lap, { start, end, durationMs: null });
        } else if (command.mode === "duration") {
          if (!lapDuration(lap) && lap.start == null && lap.end == null)
            throw new Error("For a missing lap use start/finish timestamps to recover the timer.");
          lap.durationMs = parseDuration(command.duration);
        } else throw new Error("Choose duration or timestamps.");
        lap.pointsOverride = null;
        if (entry.laps[i + 1]) entry.laps[i + 1].pointsOverride = null;
      }
      entry.laps[i] = lap;
    } else if (["start", "end", "pass", "group_start"].includes(type)) {
      if (entry?.officialScore || (type === "group_start" && session.entries.some(e => e.officialScore)))
        throw new Error("Historical published records require an explicitly accepted source revision before timing changes.");
      if (session.finished || session.mode === "archived")
        throw new Error("This session is locked. Reopen it before timing.");
      const at = Number(command.at);
      if (
        !Number.isFinite(at) ||
        Math.abs(now - at) > 600000 ||
        istDate(at) !== session.date
      )
        throw new Error(
          "Check the device clock and session date before timing.",
        );
      if (type === "group_start") {
        if (!session.entries.length) throw new Error("Mark attendance first.");
        if (session.entries.some((e) => e.laps.length))
          throw new Error(
            "Group start has already been used. Start late arrivals individually.",
          );
        session.entries.forEach((e) => e.laps.push({ start: at, end: null }));
      } else {
        if (!entry) throw new Error("Rider not present.");
        const i = Number(command.lap) - 1;
        if (
          !Number.isInteger(i) ||
          i < 0 ||
          i > 4 ||
          (type === "pass" && i === 4)
        )
          throw new Error("Invalid lap action.");
        const lap = entry.laps[i] || {};
        if (type === "start") {
          if (lap.start != null || lapDuration(lap))
            throw new Error("Lap already started or recorded.");
          if (i && !lapDuration(entry.laps[i - 1]))
            throw new Error("Finish the previous lap first.");
          if (entry.laps[i - 1]?.end > at)
            throw new Error("Start cannot precede the previous finish.");
          entry.laps[i] = { start: at, end: null };
        } else {
          if (
            lap.start == null ||
            lap.end != null ||
            lap.durationMs ||
            at <= lap.start
          )
            throw new Error(
              "This lap is not running, or the finish is before its start.",
            );
          if (entry.laps[i + 1]?.start != null)
            throw new Error("The next lap already started.");
          lap.end = at;
          if (type === "pass") entry.laps[i + 1] = { start: at, end: null };
        }
      }
    } else throw new Error("Unknown Ridge action.");
  }
  for (const s of state.sessions) sessionSpotlight(state, s);
  const feed = buildPublicFeed(state); // validates one award per rider before commit
  return {
    state,
    feed,
    audit: {
      type,
      sessionId: sessionId || null,
      riderId: riderId || null,
      detail,
      command,
    },
  };
}

// Ported from the organiser’s published Apps Script category rules.
function selectSpotlight(date, rows, times, state) {
  const defs = [
    [
      "leader",
      "Session leader",
      "Highest trial score",
      "Improvement points plus completed loops, before Spotlight bonuses.",
    ],
    [
      "endurance",
      "Endurance standout",
      "Fastest four-loop total",
      "Quickest combined time over the first four loops.",
    ],
    [
      "fastest",
      "Fastest lap",
      "Fastest individual loop",
      "Fastest completed lap.",
    ],
    [
      "improvement",
      "Biggest improvement",
      "Biggest single improvement",
      "Largest positive lap-to-lap improvement.",
    ],
    [
      "finish",
      "Strong finish",
      "Strongest final-loop rebound",
      "Largest positive final-loop improvement, with at least three loops.",
    ],
    [
      "consistent",
      "Most consistent",
      "Most consistent four-loop ride",
      "Smallest spread over the first four loops.",
    ],
  ];
  const used = new Set(),
    key = (n) => String(n).trim().toLowerCase(),
    num = (v) => Number(v) || 0,
    round = (v) => Math.round(v * 100) / 100;
  const seconds = (v) => {
    if (!v) return null;
    const p = String(v).replace(/^'/, "").split(":").map(Number);
    return p.length >= 2 && p.length <= 3 && p.every(Number.isFinite)
      ? p.reduce((a, b) => a * 60 + b, 0)
      : null;
  };
  const fmt = (v) =>
    Math.floor(v / 60) + ":" + (v % 60).toFixed(2).padStart(5, "0");
  const historical = date === "19-09-2026",
    required = historical ? 5 : 4;
  return defs.map(([id, title, criterion, description]) => {
    if (historical && id === "leader") {
      criterion = "Highest combined lap improvement";
      description =
        "The first trial session used combined lap improvement points.";
    }
    if (historical && (id === "endurance" || id === "consistent")) {
      criterion = criterion.replace("four", "five");
      description = description.replace("four", "five");
    }
    const award = {
      id,
      title,
      criterion,
      winners: [],
      metric: "—",
      description:
        description +
        " One Spotlight per rider; previous category winners are excluded.",
    };
    const eligible = rows.filter((r) => num(r[8]) > 0 && !used.has(key(r[1])));
    let incomplete = false;
    const candidates = eligible
      .map((r) => {
        const n = Math.min(5, num(r[8])),
          t = (times[date + "|" + key(r[1])] || []).slice();
        if (!t[0] && r[2]) t[0] = r[2];
        const ts = Array.from({ length: n }, (_, i) => seconds(t[i]));
        let value = null;
        if (id === "leader") value = num(r[7]) + (historical ? 0 : n);
        if (id === "improvement" && n >= 2) {
          const pts = r.slice(3, 3 + n - 1);
          if (pts.some((v) => v === "" || v == null)) incomplete = true;
          else {
            value = Math.max(...pts.map(num));
            if (value <= 0) value = null;
          }
        }
        if (id === "finish" && n >= 3) {
          const v = r[n + 1];
          if (v === "" || v == null) incomplete = true;
          else if (num(v) > 0) value = num(v);
        }
        if (id === "fastest") {
          if (ts.some((v) => v === null || v <= 0)) incomplete = true;
          else value = Math.min(...ts);
        }
        if ((id === "endurance" || id === "consistent") && n >= required) {
          const tt = ts.slice(0, required);
          if (tt.some((v) => v === null || v <= 0)) incomplete = true;
          else
            value =
              id === "endurance"
                ? tt.reduce((a, b) => a + b, 0)
                : Math.max(...tt) - Math.min(...tt);
        }
        return { name: r[1], value };
      })
      .filter((x) => x.value !== null);
    const override = (state.spotlights || []).find(
      (x) => x.date === date && x.award === id,
    );
    if (override) {
      const winners = [
        ...new Set(override.winners.map((n) => String(n).trim())),
      ];
      if (winners.some((n) => used.has(key(n))))
        throw new Error(
          "Spotlight correction repeats a winner on " +
            date +
            " / " +
            title +
            ". Remove or revise that correction.",
        );
      award.winners = winners;
      award.metric = override.metric;
      award.description += " Result confirmed by organisers.";
    } else if (incomplete) {
      award.metric = "Awaiting complete lap records";
      award.description +=
        " Eligible riders have missing records; no bonus point is assigned yet.";
    } else if (candidates.length) {
      const ascending = ["endurance", "fastest", "consistent"].includes(id);
      candidates.sort(
        (a, b) =>
          (ascending ? a.value - b.value : b.value - a.value) ||
          a.name.localeCompare(b.name),
      );
      const best = round(candidates[0].value);
      award.winners = candidates
        .filter((x) => round(x.value) === best)
        .map((x) => x.name);
      award.metric =
        id === "leader"
          ? best.toFixed(2) + " pts"
          : ["improvement", "finish"].includes(id)
            ? "+" + best.toFixed(2) + "%"
            : fmt(best) + (id === "consistent" ? " spread" : "");
    } else {
      award.metric = "No eligible rider";
      award.description +=
        " No remaining rider meets this category’s requirements.";
    }
    award.winners.forEach((n) => used.add(key(n)));
    return award;
  });
}


