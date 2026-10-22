import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { useSupabaseList } from "./publicData";
import { useStravaSyncedTick } from "./stravaEvents";
import { LAB_PAGE_TEXT, RIDGE_PAGE_TEXT, MEMBERSHIP_PAGE_TEXT } from "../data/labContent";

// ============================================================================
// Data of the RTG Lab (/lab, /lab/strava, /lab/ridge) and Membership
// (/membership) pages: the hooks that read their tables, and the maths that
// turns those rows into rankings. No placeholder rows anywhere — a page only
// ever shows what is in the database.
// ============================================================================

// ---- Wording ---------------------------------------------------------------
export const labPageKey = (field) => `text.lab.${field}`;
export const ridgePageKey = (field) => `text.ridge.${field}`;
export const membershipPageKey = (field) => `text.membership.${field}`;

const buildCopy = (settings, fields, keyOf) =>
  Object.fromEntries(fields.map((f) => [f.field, settings[keyOf(f.field)] ?? f.text]));

export const buildLabCopy = (settings) => buildCopy(settings, LAB_PAGE_TEXT, labPageKey);
export const buildRidgeCopy = (settings) => buildCopy(settings, RIDGE_PAGE_TEXT, ridgePageKey);
export const buildMembershipCopy = (settings) => buildCopy(settings, MEMBERSHIP_PAGE_TEXT, membershipPageKey);

// "Hello {name}" + { name: "RTG" } -> "Hello RTG"
export const fill = (template, values = {}) =>
  String(template ?? "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
export const splitList = (text) => String(text || "").split(",").map((s) => s.trim()).filter(Boolean);
export const splitLines = (text) => String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);

// ---- Lab hub lists ---------------------------------------------------------

// The lab cards (Admin -> Lab — Labs).
export function useLabProgrammes() {
  return useSupabaseList("lab_programmes", {
    staticFallback: [],
    mapRow: (r) => ({
      id: r.id,
      slug: r.slug,
      numberLabel: r.number_label,
      pill: r.pill,
      artWord: r.art_word,
      eyebrow: r.eyebrow,
      title: r.title,
      description: r.description,
      tags: r.tags || [],
      tone: r.tone === "purple" ? "purple" : "orange",
      buttonLabel: r.button_label,
      link: r.link,
      secondaryLabel: r.secondary_label,
      secondaryLink: r.secondary_link,
      note: r.availability_note,
      aboutTitle: r.about_title,
      aboutBody: r.about_body,
    }),
  });
}

// Reward periods: the strip on the Lab page and the period buttons of the
// Strava dashboard (Admin -> Lab — Reward Periods). `kind` decides how a
// period's dates are worked out — see periodRange() below.
export function useLabPeriods() {
  return useSupabaseList("lab_periods", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, slug: r.slug, name: r.name, kind: r.kind }),
  }).items;
}

// The three floating tiles of the Lab hero (Admin -> Lab — Hero Tiles).
export function useLabHighlights() {
  return useSupabaseList("lab_highlights", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, icon: r.icon, label: r.label, text: r.text }),
  }).items;
}

// "More than a rank" (Admin -> Lab — Principles).
export function useLabPrinciples() {
  return useSupabaseList("lab_principles", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, title: r.title, text: r.text }),
  }).items;
}

// The numbered steps of the access window (Admin -> Lab — Access Steps).
export function useLabAccessSteps() {
  return useSupabaseList("lab_access_steps", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, title: r.title, text: r.text, step: r.step_key }),
  }).items;
}

// Sports of the Strava Challenge (Admin -> Lab — Sports).
export function useLabSports() {
  return useSupabaseList("lab_sports", {
    staticFallback: [],
    mapRow: (r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      speedMinActivities: Number(r.speed_min_activities) || 0,
      speedMinAvgKm: Number(r.speed_min_avg_km) || 0,
      showPace: Boolean(r.show_pace),
    }),
  }).items;
}

// Age categories of the Strava Challenge (Admin -> Lab — Age Categories).
export function useLabAgeGroups() {
  return useSupabaseList("lab_age_groups", {
    staticFallback: [],
    mapRow: (r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      minAge: r.min_age === null || r.min_age === undefined ? null : Number(r.min_age),
      maxAge: r.max_age === null || r.max_age === undefined ? null : Number(r.max_age),
    }),
  }).items;
}

// ---- Member state: registration + Strava link -------------------------------

// Whether the signed-in member has registered for a lab, and a way to do so.
// Registering is what puts a member's Strava activities on the public board.
export function useLabRegistration(userId, programmeSlug) {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));
  // Whose registration the answer above is for — so a member who has just
  // logged in counts as "still checking" until their own answer arrives.
  const [checkedFor, setCheckedFor] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !programmeSlug) {
      setRegistered(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("lab_registrations")
      .select("id")
      .eq("user_id", userId)
      .eq("programme_slug", programmeSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRegistered(Boolean(data));
        setCheckedFor(userId);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, programmeSlug]);

  const register = useCallback(async () => {
    if (!userId) return false;
    const { error } = await supabase.from("lab_registrations").insert({ user_id: userId, programme_slug: programmeSlug });
    // 23505 = already registered (e.g. from another tab) — still a success.
    if (error && error.code !== "23505") throw error;
    setRegistered(true);
    return true;
  }, [userId, programmeSlug]);

  const pending = isSupabaseConfigured && Boolean(userId && programmeSlug) && checkedFor !== userId;
  return { registered: registered && !pending, loading: loading || pending, register };
}

// Has the signed-in member linked Strava? (null while unknown.)
export function useStravaLinked(userId) {
  const [linked, setLinked] = useState(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setLinked(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("strava_athlete_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLinked(Boolean(data?.strava_athlete_id));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return linked;
}

// ---- Strava Challenge: periods ---------------------------------------------
export const DAY = 86400000;

// Today in India, as a UTC midnight — every period is a whole number of days.
export function todayIST(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
}

// A calendar period, `offset` periods back from the current one. Weeks start
// on Monday; quarters and half-years follow the calendar year. `cutoff` is
// where the results stop: the end of the period, or tomorrow if it is still
// running.
export function periodRange(kind, offset = 0, today = todayIST()) {
  const d = new Date(today);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  let start;
  let end;
  if (kind === "week") {
    const dow = (d.getUTCDay() + 6) % 7;
    start = today - dow * DAY - offset * 7 * DAY;
    end = start + 7 * DAY;
  } else if (kind === "month") {
    start = Date.UTC(y, m - offset, 1);
    end = Date.UTC(y, m - offset + 1, 1);
  } else if (kind === "quarter") {
    const q = Math.floor(m / 3) * 3 - offset * 3;
    start = Date.UTC(y, q, 1);
    end = Date.UTC(y, q + 3, 1);
  } else if (kind === "half_year") {
    const h = Math.floor(m / 6) * 6 - offset * 6;
    start = Date.UTC(y, h, 1);
    end = Date.UTC(y, h + 6, 1);
  } else {
    start = Date.UTC(y - offset, 0, 1);
    end = Date.UTC(y - offset + 1, 0, 1);
  }
  return { start, end, cutoff: Math.min(end, today + DAY) };
}

// The period before it, cut to the same elapsed span — so a week that is
// three days old is compared with the first three days of the week before.
export function previousRange(kind, offset = 0, today = todayIST()) {
  const now = periodRange(kind, offset, today);
  const prev = periodRange(kind, offset + 1, today);
  return { ...prev, cutoff: Math.min(prev.end, prev.start + (now.cutoff - now.start)) };
}

export const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
export const formatDay = (ms) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// ---- Strava Challenge: the board -------------------------------------------

// One sport's results for one period, with the period before it for the
// "progress" figures. The numbers come from lab_strava_board() in the
// database: registered members' synced Strava activities, plus any
// activities typed in by hand (Admin -> Lab — Manual Activities). The public
// never reads a member's individual activities — only these totals.
export function useStravaBoard(sportSlug, range, prior) {
  const [state, setState] = useState({ rows: [], loading: true, error: "" });
  const start = range ? isoDate(range.start) : null;
  const end = range ? isoDate(range.cutoff) : null;
  const prevStart = prior ? isoDate(prior.start) : null;
  const prevEnd = prior ? isoDate(prior.cutoff) : null;
  const synced = useStravaSyncedTick();

  useEffect(() => {
    if (!isSupabaseConfigured || !sportSlug || !start) {
      setState({ rows: [], loading: false, error: "" });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    supabase
      .rpc("lab_strava_board", { p_sport: sportSlug, p_start: start, p_end: end, p_prev_start: prevStart, p_prev_end: prevEnd })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ rows: [], loading: false, error: error.message });
          return;
        }
        setState({
          loading: false,
          error: "",
          rows: (data || []).map((r) => ({
            id: r.athlete_key,
            name: r.athlete_name,
            city: r.city || "",
            avatar: r.avatar_url || "",
            gender: r.gender || "",
            age: r.age === null || r.age === undefined ? null : Number(r.age),
            sample: Boolean(r.is_sample),
            distance: Number(r.distance_km) || 0,
            movingHours: Number(r.moving_hours) || 0,
            elevation: Number(r.elevation_m) || 0,
            activities: Number(r.activities) || 0,
            prior:
              Number(r.prev_activities) > 0
                ? {
                    distance: Number(r.prev_distance_km) || 0,
                    movingHours: Number(r.prev_moving_hours) || 0,
                    elevation: Number(r.prev_elevation_m) || 0,
                    activities: Number(r.prev_activities) || 0,
                  }
                : null,
            series: {
              distance: (r.series_distance || []).map(Number),
              movingHours: (r.series_hours || []).map(Number),
              elevation: (r.series_elevation || []).map(Number),
            },
          })),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [sportSlug, start, end, prevStart, prevEnd, synced]);

  return state;
}

// distance (km) | speed (km/h) | elevation (m) of one set of totals.
export const metricOf = (totals, key) =>
  key === "speed" ? (totals.movingHours ? totals.distance / totals.movingHours : 0) : totals[key] || 0;

export const inAgeGroup = (age, group) =>
  !group || (age !== null && (group.minAge === null || age >= group.minAge) && (group.maxAge === null || age <= group.maxAge));

// Filters, measures and ranks the rows of the board. Equal values (to two
// decimals) share a rank; names only order the tied rows.
export function rankBoard(rows, { metric, gender, ageGroup, sport }) {
  const list = rows
    .filter((a) => gender === "all" || a.gender === gender)
    .filter((a) => inAgeGroup(a.age, ageGroup))
    .filter(
      (a) =>
        metric !== "speed" ||
        !sport ||
        (a.activities >= sport.speedMinActivities && a.distance >= sport.speedMinAvgKm * a.activities)
    )
    .map((a) => {
      const value = Number(metricOf(a, metric).toFixed(2));
      const oldValue = a.prior ? metricOf(a.prior, metric) : 0;
      return { ...a, value, oldValue, change: oldValue ? ((metricOf(a, metric) - oldValue) / oldValue) * 100 : null };
    })
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  list.forEach((a, i) => {
    a.rank = i && a.value === list[i - 1].value ? list[i - 1].rank : i + 1;
  });
  return list;
}

// An athlete's journey through the period: the chosen measure at seven
// checkpoints (running totals; speed = distance so far / time so far).
export const seriesOf = (athlete, metric) =>
  athlete.series.distance.map((distance, i) =>
    metricOf({ distance, movingHours: athlete.series.movingHours[i], elevation: athlete.series.elevation[i] }, metric)
  );

// ---- Ridge Repeats ---------------------------------------------------------

// "21:16" -> 1276 seconds (also h:mm:ss); anything else -> null.
export function clockToSeconds(value) {
  const text = String(value || "").trim();
  if (!/^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(text)) return null;
  const parts = text.split(":");
  if (parts.slice(1).some((part) => Number(part) >= 60)) return null;
  const result = parts.reduce((sum, part) => sum * 60 + Number(part), 0);
  return result > 0 && Number.isFinite(result) ? result : null;
}
export function secondsToClock(value) {
  if (!Number.isFinite(value)) return "—";
  const n = Math.max(0, Math.round(value));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
const round2 = (n) => Math.round(n * 100) / 100;
export const riderKey = (name) => String(name || "").trim().toLocaleLowerCase();

// Sessions, results, awards and Spotlight winners (Admin -> Ridge Repeats —
// …), read together and re-read on demand. `checkedAt` is when they were
// last read.
export function useRidgeFeed(enabled = true) {
  const empty = { sessions: [], results: [], awards: [], spotlights: [] };
  const [state, setState] = useState({ ...empty, loading: false, error: "", checkedAt: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) {
      setState({ ...empty, loading: false, error: "", checkedAt: null });
      return;
    }
    let cancelled = false;
    const read = async () => {
      const { data, error } = await supabase.from("ridge_publication").select("feed,updated_at").eq("singleton", true).maybeSingle();
      if (cancelled) return;
      setState({ ...(data?.feed || empty), loading: false, error: error || !data ? "Ridge results are not available yet. Please try again shortly." : "", checkedAt: data ? new Date(data.updated_at) : null });
    };
    setState(s => ({ ...s, loading: true }));
    read().catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false, error: "Could not connect to Ridge results. Try refreshing." })); });
    const interval = setInterval(() => read().catch(() => {}), 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tick, enabled]);
  const reload = useCallback(() => setTick(n => n + 1), []);
  return { ...state, reload };
}

export const ridgeAthleteKey = (row) => row.athleteId ? `id:${row.athleteId}` : `name:${riderKey(row.name)}`;
const validRidgeDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

// Explicit official-published rows preserve source scores. Legacy manual rows
// retain their original duration-based calculation. Never infer official status.
export function buildRidgeFeed({ sessions = [], results = [], awards = [], spotlights = [] }, maxLoops) {
  const bySession = new Map();
  const diagnostics = [];
  const officialCounts = new Map();
  results.filter(r => r.score_source === "official-published").forEach(r => {
    const date = r.session_date || sessions.find(s => s.slug === r.session_slug)?.session_date;
    const key = `${r.athlete_id}|${date}`;
    officialCounts.set(key, (officialCounts.get(key) || 0) + 1);
  });
  results.forEach((r) => {
    const official = r.score_source === "official-published";
    const session = sessions.find(s => s.slug === r.session_slug);
    const date = r.session_date || session?.session_date;
    let row;
    if (official) {
      const reject = (code) => diagnostics.push({ id: r.id, code, source: "official-published" });
      if (!r.athlete_id || r.identity_unresolved || !r.athlete_name || !session || !validRidgeDate(date) || date !== session.session_date) { reject("OFFICIAL_IDENTITY_OR_SESSION_INVALID"); return; }
      if (officialCounts.get(`${r.athlete_id}|${date}`) > 1) { reject("OFFICIAL_DUPLICATE_RIDER_DATE"); return; }
      if (!Array.isArray(r.lap_points) || r.lap_points.length !== 5 || r.lap_points[0] !== null ||
          !r.lap_points.every(p => p === null || Number.isFinite(p)) ||
          !(r.improvement === null || Number.isFinite(r.improvement)) ||
          !Number.isInteger(r.completed_laps) || r.completed_laps < 0 || r.completed_laps > 5 ||
          !Number.isFinite(r.highlight_score) || !Number.isFinite(r.total_score)) { reject("OFFICIAL_SCORE_INVALID"); return; }
      if (r.improvement !== null && Math.abs(r.total_score - r.improvement - r.completed_laps - r.highlight_score) > 0.011 + Number.EPSILON * 100) { reject("OFFICIAL_TOTAL_MISMATCH"); return; }
      // Missing historical durations remain empty fixed slots, not invented
      // comparisons. l1_time is the only time the score-sheet itself supplies.
      const raw = Array.isArray(r.lap_times) ? r.lap_times : r.loop_times != null ? String(r.loop_times).split(",") : [r.l1_time];
      if (raw.length > 5) { reject("OFFICIAL_LAP_SLOTS_INVALID"); return; }
      const times = Array.from({ length: 5 }, (_, i) => raw[i] == null ? "" : String(raw[i]).trim());
      row = {
        id: r.id, name: r.athlete_name, athleteId: r.athlete_id, session: r.session_slug,
        photo: r.photo_url || "", lapTimes: times, lapSeconds: times.map(clockToSeconds),
        lapPoints: [...r.lap_points], laps: r.completed_laps, progress: r.improvement,
        spotlight: r.highlight_score, adjustment: 0, ridgePoints: r.total_score,
        scoreSource: "official-published", provenance: r.provenance || null,
      };
    } else {
      const times = String(r.loop_times || "").split(",").map(t => t.trim());
      while (times.length && !times[times.length - 1]) times.pop();
      const secs = times.map(clockToSeconds);
      const laps = times.filter(Boolean).length;
      const computedPoints = secs.map((v, i) => (i === 0 || v === null || secs[i - 1] === null ? null : round2(((secs[i - 1] - v) / secs[i - 1]) * 100)));
      const lapPoints = Array.isArray(r.lap_points) ? r.lap_points : computedPoints;
      const valid = laps >= 2 && laps <= maxLoops && secs.every(v => v !== null);
      const progress = valid ? (Number.isFinite(r.progress_points) ? r.progress_points : round2(lapPoints.slice(1).reduce((sum, p) => sum + p, 0))) : null;
      const spotlight = Number(r.spotlight_points) || 0;
      const adjustment = Number(r.adjustment_points) || 0;
      row = {
        id: r.id, name: r.athlete_name, athleteId: r.athlete_id || null, session: r.session_slug,
        photo: r.photo_url || "", lapTimes: times, lapSeconds: secs, lapPoints, laps, progress,
        spotlight, adjustment, ridgePoints: Number.isFinite(r.total_score) ? r.total_score : round2((progress || 0) + Math.min(laps, maxLoops) + spotlight + adjustment),
        scoreSource: "manual-derived", provenance: null,
      };
    }
    row.key = ridgeAthleteKey(row);
    if (!bySession.has(row.session)) bySession.set(row.session, []);
    bySession.get(row.session).push(row);
  });
  // Undated legacy sessions stay visible, but cannot establish progress over time.
  const list = sessions.map(s => ({
    slug: s.slug, name: s.name, awardDefinitions: s.award_definitions || [], date: validRidgeDate(s.session_date) ? s.session_date : null,
    stamp: validRidgeDate(s.session_date) ? Date.parse(`${s.session_date}T00:00:00Z`) : 0,
    riders: (bySession.get(s.slug) || []).map(row => ({ ...row, date: validRidgeDate(s.session_date) ? s.session_date : null })),
  })).sort((a, b) => b.stamp - a.stamp);
  list.forEach(s => s.riders.forEach(row => { row.stamp = s.stamp; }));
  const riders = new Map();
  list.forEach(s => s.riders.forEach(row => {
    const key = row.key;
    if (!riders.has(key)) riders.set(key, { key, athleteId: row.athleteId, name: row.name, photo: "", records: [], totalPoints: 0, scoreSource: row.scoreSource });
    const profile = riders.get(key);
    profile.records.push(row);
    profile.totalPoints = round2(profile.totalPoints + row.ridgePoints);
    if (profile.scoreSource !== row.scoreSource) profile.scoreSource = "mixed";
    if (!profile.photo && row.photo) profile.photo = row.photo;
  }));
  const awardList = awards.map(a => ({ slug: a.slug, name: a.name, description: a.description || "", tone: a.tone || "" }));
  const winners = spotlights.map(w => ({ session: w.session_slug, award: w.award_slug, name: w.athlete_name, metric: w.metric || "" }));
  const sources = new Set([...riders.values()].map(r => r.scoreSource));
  const scoreSource = sources.size > 1 || sources.has("mixed") ? "mixed" : [...sources][0] || "empty";
  return { sessions: list, riders: [...riders.values()], awards: awardList, winners, maxLoops, scoreSource, diagnostics,
    hasOfficialScores: [...riders.values()].some(r => r.records.some(row => row.scoreSource === "official-published")) };
}

// Zero progress is meaningful; missing/non-finite progress and <=1 loop are not.
export const averageProgress = (row) => row && Number.isFinite(row.progress) && Number.isInteger(row.laps) && row.laps >= 2 && row.laps <= 5
  ? row.progress / (row.laps - 1) : null;

export function overallRecord(profile) {
  const eligible = profile.records.filter(row => averageProgress(row) !== null && validRidgeDate(row.date));
  const counts = new Map();
  eligible.forEach(row => counts.set(row.date, (counts.get(row.date) || 0) + 1));
  // Ambiguous same-date records cannot be picked by array order.
  const duplicateDates = [...counts].filter(([, count]) => count > 1).map(([date]) => date);
  const qualifying = eligible.filter(row => counts.get(row.date) === 1).slice().sort((a, b) => a.date.localeCompare(b.date));
  const first = qualifying[0];
  const latest = qualifying[qualifying.length - 1];
  return { ...profile, qualifying, first, latest, duplicateDates,
    value: qualifying.length >= 2 && !duplicateDates.length ? averageProgress(latest) - averageProgress(first) : null, place: null };
}

// Highest value first; equal values (to two decimals) share a place; riders
// without a value follow, by total points.
export function rankRows(rows) {
  const ranked = rows
    .filter((row) => row.value !== null && row.value !== undefined)
    .sort((a, b) => Math.round(b.value * 100) - Math.round(a.value * 100) || a.name.localeCompare(b.name));
  ranked.forEach((row, i) => {
    row.place = i && Math.round(row.value * 100) === Math.round(ranked[i - 1].value * 100) ? ranked[i - 1].place : i + 1;
  });
  const waiting = rows
    .filter((row) => row.value === null || row.value === undefined)
    .sort((a, b) => (b.totalPoints ?? b.ridgePoints ?? 0) - (a.totalPoints ?? a.ridgePoints ?? 0) || a.name.localeCompare(b.name));
  return [...ranked, ...waiting];
}

// The board for one ranking mode: overall | progress | points | alltime.
export function ridgeStandings(feed, mode, sessionSlug) {
  if (mode === "overall") return rankRows(feed.riders.map(overallRecord));
  if (mode === "alltime") return rankRows(feed.riders.map((p) => ({ ...p, value: p.totalPoints, place: null })));
  const session = feed.sessions.find((s) => s.slug === sessionSlug);
  return rankRows(
    (session?.riders || []).map((row) => ({ ...row, value: mode === "progress" ? row.progress : row.ridgePoints, place: null }))
  );
}

// A rider's place on one session's progress board.
export function sessionProgressRank(feed, name, sessionSlug, athleteId = null) {
  const session = feed.sessions.find((s) => s.slug === sessionSlug);
  const rows = rankRows((session?.riders || []).map((row) => ({ ...row, value: row.progress, place: null })));
  const matches = athleteId ? rows.filter(row => row.athleteId === athleteId) : typeof name === "object"
    ? rows.filter(row => row.key === ridgeAthleteKey(name))
    : rows.filter(row => row.key === name || riderKey(row.name) === riderKey(name));
  return matches.length === 1 ? matches[0].place || null : null;
}

// A rider's journey for the charts: for every published session (oldest
// first), their gain over their own first qualifying session — null where
// they did not ride (a gap, not a zero).
export function trendPoints(feed, overall) {
  const baseline = averageProgress(overall.first);
  return feed.sessions
    .slice()
    .reverse()
    .map((s) => {
      const record = overall.qualifying.find((r) => r.session === s.slug);
      return { session: s.slug, date: s.date, stamp: s.stamp, value: record ? averageProgress(record) - baseline : null, record };
    });
}

// The Spotlight awards of one session: every award, with its winners.
export function sessionAwards(feed, sessionSlug) {
  const definitions = feed.sessions.find(s => s.slug === sessionSlug)?.awardDefinitions || [];
  return feed.awards.map((award) => {
    const definition = definitions.find(a => a.id === award.slug);
    const rows = feed.winners.filter((w) => w.session === sessionSlug && w.award === award.slug);
    return { ...award, description: definition?.description || award.description, winners: rows.map((w) => w.name), metric: rows[0]?.metric || definition?.metric || "" };
  });
}

// ---- Membership ------------------------------------------------------------

// The plans (Admin -> Membership — Plans): the Club membership and the Ridge
// Repeats session packs.
export function useMembershipPlans() {
  const { items, loading } = useSupabaseList("membership_plans", {
    staticFallback: [],
    mapRow: (r) => ({
      id: r.id,
      slug: r.slug,
      kind: r.kind,
      name: r.name,
      sessions: Number(r.sessions) || 0,
      price: Number(r.price) || 0,
      clubPrice: r.club_price === null || r.club_price === undefined ? null : Number(r.club_price),
      billingLabel: r.billing_label || "",
      validityWeeks: Number(r.validity_weeks) || 0,
      featured: Boolean(r.featured),
    }),
  });
  return { plans: items, loading };
}

export function useMembershipPerks() {
  return useSupabaseList("membership_perks", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text, reviewLabel: r.review_label, reviewValue: r.review_value }),
  }).items;
}

export function useMembershipGuides() {
  return useSupabaseList("membership_guides", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, title: r.title, text: r.text, linkLabel: r.link_label, action: r.link_action }),
  }).items;
}

export function useMembershipSteps() {
  return useSupabaseList("membership_steps", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, title: r.title, text: r.text }),
  }).items;
}

export function useMembershipFaqs() {
  return useSupabaseList("membership_faqs", {
    staticFallback: [],
    mapRow: (r) => ({ id: r.id, question: r.question, answer: r.answer }),
  }).items;
}

// The signed-in member's own purchases, newest first.
export function useMyMemberships(userId) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("membership_purchases")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRows(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return rows;
}

export const isActiveClub = (purchases, today = isoDate(todayIST())) =>
  purchases.some((p) => p.kind === "club" && p.status === "active" && (!p.valid_until || p.valid_until >= today));

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// What a Ridge pack costs. The single-session plan sets the full price of a
// session; a pack's saving is measured against it. `club` applies the Club
// member price where a plan has one (the single session).
export function quotePlan(plan, plans, club = false) {
  const single = plans.find((p) => p.kind === "ridge" && p.sessions === 1);
  const base = single ? single.price : plan.sessions ? plan.price / plan.sessions : plan.price;
  const clubRate = club && plan.clubPrice !== null;
  const total = clubRate ? plan.clubPrice : plan.price;
  const sessions = plan.sessions || 1;
  const full = base * sessions;
  return {
    total,
    per: total / sessions,
    saving: Math.max(0, full - total),
    percent: full ? Math.max(0, ((full - total) / full) * 100) : 0,
    weeks: plan.validityWeeks,
    clubRate,
  };
}

// useMemo'd convenience: the plans split by kind.
export function useSplitPlans(plans) {
  return useMemo(
    () => ({
      club: plans.find((p) => p.kind === "club") || null,
      ridge: plans.filter((p) => p.kind === "ridge").sort((a, b) => a.sessions - b.sessions),
    }),
    [plans]
  );
}


