import { describe, expect, it } from "vitest";
import { axisTop, percentChange, splitPeriods, stackLayers, sumGroups, visitsOn, weekdayAverages } from "../../../src/admin/visitorStats.js";

const day = (iso, members, left, browsed, people = 0) => ({ day: iso, members, left, browsed, people });

describe("visitsOn() / sumGroups()", () => {
  it("adds the three kinds of visit", () => {
    expect(visitsOn(day("2026-10-01", 2, 3, 4))).toBe(9);
    expect(visitsOn({})).toBe(0);
  });

  it("totals each group and overall", () => {
    const out = sumGroups([day("2026-10-01", 1, 2, 3), day("2026-10-02", 4, 5, 6)]);
    expect(out).toEqual({ members: 5, left: 7, browsed: 9, visits: 21 });
  });
});

describe("splitPeriods()", () => {
  it("takes the newest `range` days as current and the ones before as previous", () => {
    const days = Array.from({ length: 6 }, (_, i) => day(`2026-10-0${i + 1}`, i, 0, 0));
    const { current, previous } = splitPeriods(days, 3);
    expect(current.map((d) => d.day)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(previous.map((d) => d.day)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("leaves previous short when history doesn't go back far enough", () => {
    const days = [day("2026-10-01", 1, 0, 0), day("2026-10-02", 1, 0, 0)];
    expect(splitPeriods(days, 7).previous).toEqual([]);
  });
});

describe("percentChange()", () => {
  it("compares with the period before", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("returns null when there was nothing before (no fake +∞%)", () => {
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("weekdayAverages()", () => {
  it("averages by weekday, Monday first", () => {
    // 2026-10-12 is a Monday; 2026-10-19 the next Monday.
    const out = weekdayAverages([day("2026-10-12", 10, 0, 0), day("2026-10-19", 20, 0, 0), day("2026-10-18", 7, 0, 0)]);
    expect(out[0]).toEqual({ label: "Mon", average: 15, samples: 2 });
    expect(out[6]).toEqual({ label: "Sun", average: 7, samples: 1 });
    expect(out[3]).toEqual({ label: "Thu", average: 0, samples: 0 });
  });
});

describe("axisTop()", () => {
  it("rounds up to a value the four grid lines divide evenly", () => {
    expect(axisTop(3)).toBe(4);
    expect(axisTop(7)).toBe(8);
    expect(axisTop(61)).toBe(80);
    expect(axisTop(130)).toBe(200);
    expect(axisTop(0)).toBe(4);
  });
});

describe("stackLayers()", () => {
  it("stacks members, then left, then browsed", () => {
    const [members, left, browsed] = stackLayers([day("2026-10-01", 2, 3, 4)]);
    expect(members.points[0]).toEqual({ low: 0, high: 2 });
    expect(left.points[0]).toEqual({ low: 2, high: 5 });
    expect(browsed.points[0]).toEqual({ low: 5, high: 9 });
  });
});
