import { describe, expect, it } from "vitest";
import {
  DAY,
  buildRidgeFeed,
  clockToSeconds,
  fill,
  inAgeGroup,
  isActiveClub,
  isoDate,
  metricOf,
  money,
  overallRecord,
  periodRange,
  previousRange,
  quotePlan,
  rankBoard,
  rankRows,
  ridgeStandings,
  secondsToClock,
  sessionAwards,
  splitLines,
  splitList,
  todayIST,
} from "../../../src/lib/labData.js";

describe("text helpers", () => {
  it("fill() replaces known placeholders and keeps unknown ones", () => {
    expect(fill("Hello {name}, {missing}", { name: "RTG" })).toBe("Hello RTG, {missing}");
    expect(fill(null)).toBe("");
    expect(fill("{n} km", { n: 0 })).toBe("0 km");
  });

  it("splitList / splitLines trim and drop blanks", () => {
    expect(splitList(" a, b ,, c ")).toEqual(["a", "b", "c"]);
    expect(splitList(null)).toEqual([]);
    expect(splitLines("one\n\n two \n")).toEqual(["one", "two"]);
  });
});

describe("periods", () => {
  it("todayIST rolls over at Indian midnight, not UTC midnight", () => {
    // 20:00 UTC on 1 Jan = 01:30 IST on 2 Jan
    expect(isoDate(todayIST(new Date(Date.UTC(2026, 0, 1, 20, 0))))).toBe("2026-01-02");
    expect(isoDate(todayIST(new Date(Date.UTC(2026, 0, 1, 18, 0))))).toBe("2026-01-01");
  });

  it("weeks start on Monday", () => {
    const wed = Date.UTC(2026, 9, 14); // Wednesday 14 Oct 2026
    const { start, end, cutoff } = periodRange("week", 0, wed);
    expect(isoDate(start)).toBe("2026-10-12");
    expect(isoDate(end)).toBe("2026-10-19");
    expect(cutoff).toBe(wed + DAY); // still running -> tomorrow
    expect(isoDate(periodRange("week", 1, wed).start)).toBe("2026-10-05");
  });

  it("a Sunday belongs to the week that started the Monday before", () => {
    const sun = Date.UTC(2026, 9, 18);
    expect(isoDate(periodRange("week", 0, sun).start)).toBe("2026-10-12");
  });

  it("months, quarters, half-years and years follow the calendar", () => {
    const d = Date.UTC(2026, 7, 20); // 20 Aug 2026
    expect(isoDate(periodRange("month", 0, d).start)).toBe("2026-08-01");
    expect(isoDate(periodRange("month", 8, d).start)).toBe("2025-12-01");
    expect(isoDate(periodRange("quarter", 0, d).start)).toBe("2026-07-01");
    expect(isoDate(periodRange("quarter", 0, d).end)).toBe("2026-10-01");
    expect(isoDate(periodRange("half_year", 0, d).start)).toBe("2026-07-01");
    expect(isoDate(periodRange("half_year", 1, d).start)).toBe("2026-01-01");
    expect(isoDate(periodRange("year", 0, d).start)).toBe("2026-01-01");
    expect(isoDate(periodRange("year", 1, d).end)).toBe("2026-01-01");
  });

  it("a finished period's cutoff is its end", () => {
    const d = Date.UTC(2026, 7, 20);
    const last = periodRange("month", 1, d);
    expect(last.cutoff).toBe(last.end);
  });

  it("previousRange compares the same elapsed span", () => {
    const wed = Date.UTC(2026, 9, 14); // 3 days into the week (Mon, Tue, Wed)
    const prev = previousRange("week", 0, wed);
    expect(isoDate(prev.start)).toBe("2026-10-05");
    expect(isoDate(prev.cutoff)).toBe("2026-10-08");
  });
});

describe("Strava board ranking", () => {
  const rows = [
    { name: "Asha", gender: "Female", age: 30, distance: 100, movingHours: 4, elevation: 500, activities: 5, prior: { distance: 50, movingHours: 2, elevation: 100 } },
    { name: "Bala", gender: "Male", age: 45, distance: 100, movingHours: 5, elevation: 900, activities: 2, prior: null },
    { name: "Chan", gender: "Male", age: 25, distance: 80, movingHours: 2, elevation: 0, activities: 8, prior: { distance: 0 } },
  ];

  it("metricOf computes speed from distance and time", () => {
    expect(metricOf({ distance: 100, movingHours: 4 }, "speed")).toBe(25);
    expect(metricOf({ distance: 100, movingHours: 0 }, "speed")).toBe(0);
    expect(metricOf({ elevation: 9 }, "elevation")).toBe(9);
    expect(metricOf({}, "distance")).toBe(0);
  });

  it("inAgeGroup handles open-ended groups and unknown ages", () => {
    expect(inAgeGroup(30, null)).toBe(true);
    expect(inAgeGroup(30, { minAge: 18, maxAge: 34 })).toBe(true);
    expect(inAgeGroup(35, { minAge: 18, maxAge: 34 })).toBe(false);
    expect(inAgeGroup(60, { minAge: 50, maxAge: null })).toBe(true);
    expect(inAgeGroup(null, { minAge: 18, maxAge: 34 })).toBe(false);
  });

  it("ties share a rank and are ordered by name", () => {
    const board = rankBoard(rows, { metric: "distance", gender: "all", ageGroup: null });
    expect(board.map((r) => [r.name, r.rank])).toEqual([
      ["Asha", 1],
      ["Bala", 1],
      ["Chan", 3],
    ]);
  });

  it("reports % change against the prior period, null without one", () => {
    const board = rankBoard(rows, { metric: "distance", gender: "all", ageGroup: null });
    expect(board.find((r) => r.name === "Asha").change).toBe(100);
    expect(board.find((r) => r.name === "Bala").change).toBeNull();
    expect(board.find((r) => r.name === "Chan").change).toBeNull();
  });

  it("filters by gender and age group", () => {
    const board = rankBoard(rows, { metric: "distance", gender: "Male", ageGroup: { minAge: 18, maxAge: 34 } });
    expect(board.map((r) => r.name)).toEqual(["Chan"]);
    expect(board[0].rank).toBe(1);
  });

  it("speed boards require the sport's minimum activities and average distance", () => {
    const sport = { speedMinActivities: 3, speedMinAvgKm: 15 };
    const board = rankBoard(rows, { metric: "speed", gender: "all", ageGroup: null, sport });
    // Bala: too few activities; Chan: 80km / 8 = 10km average < 15
    expect(board.map((r) => r.name)).toEqual(["Asha"]);
    expect(board[0].value).toBe(25);
  });
});

describe("Ridge Repeats", () => {
  it("clockToSeconds parses m:ss and h:mm:ss, rejecting junk", () => {
    expect(clockToSeconds("21:16")).toBe(1276);
    expect(clockToSeconds("1:02:03")).toBe(3723);
    expect(clockToSeconds(" 5:00.5 ")).toBe(300.5);
    expect(clockToSeconds("5:60")).toBeNull();
    expect(clockToSeconds("abc")).toBeNull();
    expect(clockToSeconds("0:00")).toBeNull();
    expect(clockToSeconds("")).toBeNull();
    expect(clockToSeconds("90")).toBeNull();
  });

  it("secondsToClock formats and guards", () => {
    expect(secondsToClock(1276)).toBe("21:16");
    expect(secondsToClock(59.6)).toBe("1:00");
    expect(secondsToClock(-3)).toBe("0:00");
    expect(secondsToClock(NaN)).toBe("—");
  });

  const feed = buildRidgeFeed(
    {
      sessions: [
        { slug: "s1", name: "Session 1", session_date: "2026-01-04" },
        { slug: "s2", name: "Session 2", session_date: "2026-02-01" },
        { slug: "old", name: "Undated", session_date: null },
      ],
      results: [
        { id: 1, athlete_name: "Asha", session_slug: "s1", loop_times: "10:00, 9:00, 8:00" },
        { id: 2, athlete_name: "asha ", session_slug: "s2", loop_times: "10:00,9:00", spotlight_points: "2" },
        { id: 3, athlete_name: "Bala", session_slug: "s1", loop_times: "10:00, junk" },
        { id: 4, athlete_name: "Chan", session_slug: "old", loop_times: "10:00,9:30", adjustment_points: -1 },
      ],
      awards: [{ slug: "grit", name: "Grit" }],
      spotlights: [{ session_slug: "s1", award_slug: "grit", athlete_name: "Bala", metric: "most improved" }],
    },
    4
  );

  it("orders sessions newest first and keeps undated sessions at the bottom", () => {
    expect(feed.sessions.map((s) => s.slug)).toEqual(["s2", "s1", "old"]);
    expect(feed.sessions[2].date).toBeNull();
  });

  it("scores progress per loop and ridge points", () => {
    const asha = feed.sessions.find((s) => s.slug === "s1").riders.find((r) => r.name === "Asha");
    // 10:00 -> 9:00 is +10%, 9:00 -> 8:00 is +11.11%
    expect(asha.lapPoints).toEqual([null, 10, 11.11]);
    expect(asha.progress).toBe(21.11);
    expect(asha.ridgePoints).toBe(24.11); // progress + 3 loops
  });

  it("a result with an unreadable lap gets no progress but keeps loop points", () => {
    const bala = feed.sessions.find((s) => s.slug === "s1").riders.find((r) => r.name === "Bala");
    expect(bala.progress).toBeNull();
    expect(bala.ridgePoints).toBe(2);
  });

  it("merges a rider across sessions case-insensitively", () => {
    const asha = feed.riders.find((r) => r.name === "asha " || r.name === "Asha");
    expect(asha.records).toHaveLength(2);
    expect(asha.totalPoints).toBe(round(24.11 + (10 + 2 + 2)));
  });

  it("overall record compares latest qualifying session with the first", () => {
    const asha = overallRecord(feed.riders.find((r) => r.records.length === 2));
    // first (s1): 21.11 / 2 = 10.555 ; latest (s2): 10 / 1 = 10
    expect(asha.value).toBeCloseTo(10 - 10.555, 6);
  });

  it("rankRows shares places on ties and puts unranked riders last by points", () => {
    const ranked = rankRows([
      { name: "B", value: 5 },
      { name: "A", value: 5.001 },
      { name: "C", value: null, totalPoints: 1 },
      { name: "D", value: 9 },
      { name: "E", value: undefined, totalPoints: 7 },
    ]);
    expect(ranked.map((r) => [r.name, r.place])).toEqual([
      ["D", 1],
      ["A", 2],
      ["B", 2],
      ["E", undefined],
      ["C", undefined],
    ]);
  });

  it("ridgeStandings supports every mode", () => {
    expect(ridgeStandings(feed, "points", "s1").map((r) => r.name)).toEqual(["Asha", "Bala"]);
    expect(ridgeStandings(feed, "progress", "s1")[0].name).toBe("Asha");
    expect(ridgeStandings(feed, "alltime")[0].totalPoints).toBeGreaterThan(0);
    expect(ridgeStandings(feed, "points", "missing")).toEqual([]);
    expect(ridgeStandings(feed, "overall").length).toBe(feed.riders.length);
  });

  it("sessionAwards lists every award with that session's winners", () => {
    expect(sessionAwards(feed, "s1")).toEqual([
      { slug: "grit", name: "Grit", description: "", tone: "", winners: ["Bala"], metric: "most improved" },
    ]);
    expect(sessionAwards(feed, "s2")[0].winners).toEqual([]);
  });
});

function round(n) {
  return Math.round(n * 100) / 100;
}

describe("membership", () => {
  const plans = [
    { kind: "ridge", sessions: 1, price: 500, clubPrice: 400, validityWeeks: 2 },
    { kind: "ridge", sessions: 4, price: 1800, clubPrice: null, validityWeeks: 6 },
  ];

  it("quotePlan measures pack savings against the single-session price", () => {
    expect(quotePlan(plans[1], plans)).toEqual({
      total: 1800,
      per: 450,
      saving: 200,
      percent: 10,
      weeks: 6,
      clubRate: false,
    });
  });

  it("quotePlan applies the club price where a plan has one", () => {
    expect(quotePlan(plans[0], plans, true)).toMatchObject({ total: 400, clubRate: true, saving: 100 });
    expect(quotePlan(plans[1], plans, true).clubRate).toBe(false);
  });

  it("isActiveClub needs an active, unexpired club purchase", () => {
    expect(isActiveClub([{ kind: "club", status: "active", valid_until: "2026-12-31" }], "2026-10-18")).toBe(true);
    expect(isActiveClub([{ kind: "club", status: "active", valid_until: null }], "2026-10-18")).toBe(true);
    expect(isActiveClub([{ kind: "club", status: "active", valid_until: "2026-10-17" }], "2026-10-18")).toBe(false);
    expect(isActiveClub([{ kind: "club", status: "pending" }], "2026-10-18")).toBe(false);
    expect(isActiveClub([{ kind: "ridge", status: "active" }], "2026-10-18")).toBe(false);
  });

  it("money formats rupees", () => {
    expect(money(1234.5)).toBe("₹1,234.5");
    expect(money(null)).toBe("₹0");
  });
});
