import { describe, it, expect } from "vitest";
import { buildRidgeFeed, averageProgress, overallRecord, ridgeAthleteKey, ridgeStandings, sessionProgressRank } from "../../../../src/lib/labData";
import { dryRunOfficialImport, officialRecordsToFeedInput, OFFICIAL_HEADERS } from "../../../../src/lib/ridge/officialImport";
const official = (changes = {}) => ({ id: "r1", athlete_id: "one", athlete_name: "Synthetic Rider", session_slug: "s1", session_date: "2026-10-03", score_source: "official-published", lap_points: [null, 10, null, -5, 0], improvement: 5, completed_laps: 4, highlight_score: 2, total_score: 11, lap_times: ["20:00", "19:00", "", "25:00", ""], ...changes });
const input = (results) => ({ sessions: [{ slug: "s1", session_date: "2026-10-03" }, { slug: "s2", session_date: "2026-10-17" }], results, awards: [], spotlights: [] });
const feed = results => buildRidgeFeed(input(results), 5);

describe("explicit official score feed", () => {
  it("preserves official values despite contradictory durations/legacy adjustments", () => {
    const result = feed([official({ adjustment_points: 999, spotlight_points: 999 })]);
    const row = result.riders[0].records[0];
    expect(row).toMatchObject({ athleteId: "one", scoreSource: "official-published", progress: 5, ridgePoints: 11, spotlight: 2, adjustment: 0, laps: 4 });
    expect(row.lapPoints).toEqual([null, 10, null, -5, 0]);
    expect(row.lapTimes).toEqual(["20:00", "19:00", "", "25:00", ""]);
    expect(row.lapSeconds).toEqual([1200, 1140, null, 1500, null]);
    expect(averageProgress(row)).toBe(5 / 3);
    expect(result.scoreSource).toBe("official-published"); expect(result.hasOfficialScores).toBe(true);
  });
  it("preserves null vs zero progress and zero total", () => {
    expect(feed([official({ improvement: null, total_score: 22 })]).riders[0].records[0].progress).toBeNull();
    const row = feed([official({ improvement: 0, completed_laps: 0, highlight_score: 0, total_score: 0 })]).riders[0].records[0];
    expect(row.ridgePoints).toBe(0); expect(row.progress).toBe(0); expect(averageProgress(row)).toBeNull();
    expect(averageProgress({ progress: 0, laps: 2 })).toBe(0);
  });
  it("groups by stable identity across corrected names and separates identical names", () => {
    const result = feed([official(), official({ id: "r2", session_slug: "s2", session_date: "2026-10-17", athlete_name: "Corrected Synthetic" }), official({ id: "r3", athlete_id: "two" })]);
    expect(result.riders).toHaveLength(2);
    expect(result.riders.find(r => r.athleteId === "one").records).toHaveLength(2);
    expect(ridgeAthleteKey(result.riders[0])).toBe("id:one");
    expect(sessionProgressRank(result, "Synthetic Rider", "s1")).toBeNull();
    expect(sessionProgressRank(result, "Synthetic Rider", "s1", "two")).toBe(1);
  });
  it("requires distinct dated qualifying sessions for overall progress", () => {
    const result = feed([official(), official({ session_slug: "s2", session_date: "2026-10-17", improvement: 8, total_score: 14 })]);
    expect(overallRecord(result.riders[0]).value).toBeCloseTo(1);
    const profile = { records: [{ date: null, progress: 1, laps: 2 }, { date: "2026-10-03", progress: 2, laps: 2 }] };
    expect(overallRecord(profile).value).toBeNull();
    profile.records.push({ date: "2026-10-03", progress: 3, laps: 2 });
    expect(overallRecord(profile).duplicateDates).toEqual(["2026-10-03"]);
    expect(overallRecord(profile).value).toBeNull();
  });
  it("rejects duplicate official rider/date instead of double-counting", () => {
    const result = feed([official(), official({ id: "duplicate" })]);
    expect(result.riders).toEqual([]);
    expect(result.diagnostics).toHaveLength(2);
  });
  it.each([{ athlete_id: null }, { identity_unresolved: true }, { lap_points: [null, 1] }, { total_score: 999 }, { improvement: undefined }, { completed_laps: 6 }, { session_date: "2026-02-30" }, { session_slug: "missing" }])("rejects invalid explicit source instead of recalculating", changes => {
    const result = feed([official(changes)]);
    expect(result.riders).toEqual([]); expect(result.diagnostics).toHaveLength(1);
  });
  it("keeps legacy manual scoring but never compacts internal gaps", () => {
    const result = feed([{ athlete_name: "Manual", session_slug: "s1", loop_times: "10:00,9:00" }, { athlete_name: "Gapped", session_slug: "s1", loop_times: "10:00,,8:00" }]);
    expect(result.scoreSource).toBe("manual-derived"); expect(result.hasOfficialScores).toBe(false);
    const manual = result.riders.find(r => r.name === "Manual").records[0];
    expect(manual.ridgePoints).toBe(12);
    const gap = result.riders.find(r => r.name === "Gapped").records[0];
    expect(gap.lapTimes).toEqual(["10:00", "", "8:00"]); expect(gap.progress).toBeNull();
  });
  it("flags mixed feeds explicitly", () => {
    const result = feed([official(), { athlete_name: "Manual", session_slug: "s1", loop_times: "10:00,9:00" }]);
    expect(result.scoreSource).toBe("mixed"); expect(ridgeStandings(result, "alltime")).toHaveLength(2);
  });
  it("maps only ready adapter results to deterministic preview sessions/record IDs", () => {
    const row = Object.fromEntries(OFFICIAL_HEADERS.map((h, i) => [h, ["03-10-2026", "Synthetic", "20:00", 5, "", "", "", 5, 2, 0, 7][i]]));
    const dryRun = dryRunOfficialImport([row], { identities: [{ id: "stable/one", name: "Synthetic" }], provenance: { workbookId: "fixture", sheet: "Session Scores", snapshotId: "v1" } });
    const raw = officialRecordsToFeedInput(dryRun);
    expect(raw.results[0].id).toBe("official:2026-10-03:stable%2Fone");
    expect(raw.sessions[0].slug).toBe("official-2026-10-03");
    expect(buildRidgeFeed(raw, 5).riders[0].totalPoints).toBe(7);
    expect(() => officialRecordsToFeedInput({ ...dryRun, ready: false })).toThrow();
    expect(raw.awards).toEqual([]); expect(raw.spotlights).toEqual([]);
  });
});
