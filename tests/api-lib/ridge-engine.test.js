import { describe, it, expect } from "vitest";
import {
  emptyRidgeState,
  applyRidgeCommand,
  parseDuration,
  formatDuration,
  scoreEntry,
  buildPublicFeed,
} from "../../src/lib/ridge/engine.js";
const at = Date.parse("2026-10-17T06:00:00+05:30");
function setup(mode = "testing") {
  return {
    schemaVersion: 1,
    riders: [
      { id: "a", name: "Asha" },
      { id: "b", name: "Bala" },
    ],
    sessions: [
      {
        id: "s",
        date: "2026-10-17",
        mode,
        finished: false,
        awardOverrides: [],
        entries: [
          { riderId: "a", laps: [], adjustment: 0 },
          { riderId: "b", laps: [], adjustment: 0 },
        ],
      },
    ],
  };
}
const run = (state, command, now = at) =>
  applyRidgeCommand(
    state,
    { sessionId: "s", riderId: "a", ...command },
    { now, newId: () => "new" },
  );
describe("native Ridge timing and scoring", () => {
  it("retains millisecond precision and validates clocks", () => {
    expect(parseDuration("21:09.250")).toBe(1269250);
    expect(formatDuration(1269250)).toBe("21:09.250");
    for (const v of ["21:60", "0:00", "12.3", "-1:00", "3:12.4567"])
      expect(() => parseDuration(v)).toThrow();
  });
  it("captures one group-start instant and rejects a second group start", () => {
    const r = run(setup(), { type: "group_start", at });
    expect(
      r.state.sessions[0].entries.every((e) => e.laps[0].start === at),
    ).toBe(true);
    expect(() => run(r.state, { type: "group_start", at })).toThrow(/already/);
  });
  it("passes atomically, recording finish and next start at the identical instant", () => {
    const a = run(setup(), { type: "start", lap: 1, at }).state;
    const end = at + 1000;
    const b = run(a, { type: "pass", lap: 1, at: end }, end).state;
    expect(b.sessions[0].entries[0].laps).toEqual([
      { start: at, end },
      { start: end, end: null },
    ]);
    expect(() => run(b, { type: "pass", lap: 1, at: end }, end)).toThrow();
  });
  it("rejects skipped laps, device clock drift, wrong dates and negative time", () => {
    for (const command of [
      { type: "start", lap: 2, at },
      { type: "start", lap: 1, at: at - 900000 },
      { type: "start", lap: 6, at },
    ])
      expect(() => run(setup(), command)).toThrow();
    const s = run(setup(), { type: "start", lap: 1, at }).state;
    expect(() => run(s, { type: "end", lap: 1, at: at - 1 })).toThrow();
  });
  it("prevents attendance removal after timing starts and session finish during a lap", () => {
    const s = run(setup(), { type: "start", lap: 1, at }).state;
    expect(() => run(s, { type: "attendance", riderIds: ["b"] })).toThrow(
      /recorded/,
    );
    expect(() => run(s, { type: "finish_session", reason: "Done" })).toThrow(
      /running/,
    );
  });
  it("locks finished sessions but allows reasoned corrections and reopening", () => {
    const s = setup();
    s.sessions[0].finished = true;
    expect(() => run(s, { type: "start", lap: 1, at })).toThrow(/locked/);
    expect(() => run(s, { type: "reopen_session", reason: "" })).toThrow(
      /reason/,
    );
    expect(
      run(s, { type: "reopen_session", reason: "Late rider" }).state.sessions[0]
        .finished,
    ).toBe(false);
  });
  it("preserves historical points instead of recalculating them", () => {
    const s = scoreEntry({
      laps: [
        { durationMs: 1200000 },
        { durationMs: 1080000, pointsOverride: 10 },
        { durationMs: 1140000, pointsOverride: -5.6 },
      ],
    });
    expect(s.progress).toBe(4.4);
    expect(s.points).toEqual([null, 10, -5.6]);
  });
  it("recalculates only comparisons affected by a duration correction", () => {
    const s = setup();
    s.sessions[0].entries[0].laps = [
      { durationMs: 1200000 },
      { durationMs: 1100000, pointsOverride: 8.3 },
      { durationMs: 1000000, pointsOverride: 9.1 },
    ];
    const next = run(s, {
      type: "correct_lap",
      lap: 2,
      mode: "duration",
      duration: "18:00",
      reason: "Stopwatch verified",
    });
    expect(
      next.state.sessions[0].entries[0].laps.map((l) => l.pointsOverride),
    ).toEqual([undefined, null, null]);
    expect(next.audit.detail.before.pointsOverride).toBe(8.3);
    expect(scoreEntry(next.state.sessions[0].entries[0]).progress).toBe(17.41);
  });
  it("requires corrections to respect adjacent timestamps", () => {
    const s = setup();
    s.sessions[0].entries[0].laps = [
      { start: at, end: at + 1000 },
      { start: at + 1000, end: at + 2000 },
    ];
    expect(() =>
      run(s, {
        type: "correct_lap",
        lap: 1,
        mode: "timestamps",
        start: new Date(at).toISOString(),
        end: new Date(at + 1500).toISOString(),
        reason: "Correction",
      }),
    ).toThrow(/overlaps/);
  });
  it("does not publish draft or archived sessions, and stable rider IDs survive renaming", () => {
    const s = setup();
    s.sessions[0].entries[0].laps = [{ durationMs: 1200000 }];
    expect(buildPublicFeed(s).results).toEqual([]);
    const live = run(s, {
      type: "session_mode",
      mode: "live",
      reason: "Publish",
    }).state;
    const renamed = run(live, {
      type: "edit_rider",
      name: "Asha Singh",
      photo: "",
      reason: "Spelling correction",
    });
    expect(renamed.feed.results[0].athlete_name).toBe("Asha Singh");
    expect(
      run(live, { type: "session_mode", mode: "archived", reason: "Archive" })
        .feed.results,
    ).toEqual([]);
  });
  it("rejects duplicate rider names and unknown commands", () => {
    expect(() =>
      run(setup(), { type: "create_rider", name: " asha " }),
    ).toThrow(/already/);
    expect(() => run(emptyRidgeState(), { type: "nope" })).toThrow();
  });
});
