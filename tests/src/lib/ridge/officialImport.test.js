import { describe, it, expect } from "vitest";
import { OFFICIAL_HEADERS, officialSessionDate, parseOfficialCsv, dryRunOfficialImport } from "../../../../src/lib/ridge/officialImport";
const options = {
  provenance: { workbookId: "synthetic-book", sheet: "Session Scores", snapshotId: "synthetic-v1" },
  identities: [{ id: "rider-1", name: "Synthetic Rider", aliases: ["Confirmed Old Name"] }],
};
const row = (changes = {}) => ({ ...Object.fromEntries(OFFICIAL_HEADERS.map((h, i) => [h, ["03-10-2026", "Synthetic Rider", "20:00", 5, "", -2, 0, 3, 4, 1, 8][i]])), ...changes });

describe("official Ridge dry-run import", () => {
  it("preserves published score fields, negative/zero points and fixed gaps without deriving durations", () => {
    const input = row(); const before = JSON.stringify(input);
    const result = dryRunOfficialImport([input], options);
    expect(result.ready).toBe(true);
    expect(result.records[0]).toMatchObject({ lap_points: [null, 5, null, -2, 0], improvement: 3, completed_laps: 4, highlight_score: 1, total_score: 8, l1_time: "20:00", session_date: "2026-10-03", athlete_id: "rider-1", identity_unresolved: false });
    expect(JSON.stringify(input)).toBe(before);
    expect(result.records[0].provenance).toEqual({ ...options.provenance, sourceRow: 2 });
  });
  it("preserves null improvement and does not manufacture zero or recalculate total", () => {
    const result = dryRunOfficialImport([row({ "Lap Improvement Score": "", "Total Score": 27 })], options);
    expect(result.records[0]).toMatchObject({ improvement: null, total_score: 27 });
    expect(result.warnings[0].code).toBe("TOTAL_UNVERIFIABLE");
    expect(result.ready).toBe(false);
  });
  it("resolves only explicit aliases", () => {
    expect(dryRunOfficialImport([row({ Rider: "Confirmed Old Name" })], options).records[0].athlete_id).toBe("rider-1");
    const result = dryRunOfficialImport([row({ Rider: "Synthetic Rider Jr" })], options);
    expect(result.ready).toBe(false);
    expect(result.records[0].identity_unresolved).toBe(true);
    expect(result.errors[0].code).toBe("UNRESOLVED_IDENTITY");
  });
  it("rejects both duplicate canonical rider/date rows, including aliases", () => {
    const result = dryRunOfficialImport([row(), row({ Rider: "Confirmed Old Name" })], options);
    expect(result.records).toEqual([]);
    expect(result.errors.map(e => e.code)).toEqual(["DUPLICATE_RIDER_DATE", "DUPLICATE_RIDER_DATE"]);
  });
  it("does not merge equal names assigned to different stable IDs", () => {
    const result = dryRunOfficialImport([row()], { ...options, identities: [...options.identities, { id: "other", name: "Synthetic Rider" }] });
    expect(result.ready).toBe(false);
    expect(result.errors.some(e => e.code === "AMBIGUOUS_ALIAS")).toBe(true);
    expect(result.records[0].athlete_id).toBeNull();
  });
  it("diagnoses totals mismatch while preserving the published total", () => {
    const result = dryRunOfficialImport([row({ "Total Score": 88 })], options);
    expect(result.ready).toBe(false);
    expect(result.records[0].total_score).toBe(88);
    expect(result.errors[0].code).toBe("TOTAL_MISMATCH");
    expect(dryRunOfficialImport([row({ "Total Score": 8.01 })], options).ready).toBe(true);
  });
  it.each(["NaN", "Infinity", "12%", "0x10", true, {}, "1,000"])("rejects malformed numeric value %s", value => {
    const result = dryRunOfficialImport([row({ "Total Score": value })], options);
    expect(result.records).toEqual([]); expect(result.ready).toBe(false);
  });
  it.each([-1, 6, 2.5, ""])("rejects invalid completed laps %s", value => {
    expect(dryRunOfficialImport([row({ "Total Laps": value })], options).ready).toBe(false);
  });
  it("requires provenance and complete headers", () => {
    expect(dryRunOfficialImport([row()]).errors.some(e => e.code === "PROVENANCE_REQUIRED")).toBe(true);
    expect(dryRunOfficialImport("Rider,Total Score\nSomeone,8", options).errors[0].code).toBe("INPUT_SCHEMA");
    expect(dryRunOfficialImport([], options).ready).toBe(false);
  });
  it("handles real CSV quoting, CRLF, BOM, empty slots and matrix input", () => {
    const csv = '\uFEFF' + OFFICIAL_HEADERS.join(',') + '\r\n03-10-2026,"Synthetic Rider",20:00,5,,-2,0,3,4,1,8\r\n';
    expect(dryRunOfficialImport(csv, options).records).toEqual(dryRunOfficialImport([row()], options).records);
    expect(dryRunOfficialImport(parseOfficialCsv(csv), options).ready).toBe(true);
    expect(parseOfficialCsv('a,b\n"comma, quote ""and""\nline",2')).toEqual([["a", "b"], ['comma, quote "and"\nline', '2']]);
  });
  it.each(['a,b\n"unfinished', 'a,b\n"a"x,2', 'a,b\na"b,2'])("rejects malformed quoted CSV", csv => {
    expect(dryRunOfficialImport(csv, options).ready).toBe(false);
  });
});

describe("textual session dates (timezone independent)", () => {
  it.each([["29-02-2024", "2024-02-29"], ["03-10-2026", "2026-10-03"], ["01-01-2000", "2000-01-01"]])("accepts %s", (input, expected) => expect(officialSessionDate(input)).toBe(expected));
  it.each(["29-02-2026", "29-02-1900", "31-04-2026", "00-10-2026", "01-13-2026", "2026-10-03", "3-10-2026", "01-01-0000", new Date()])("rejects non-calendar date %s", input => expect(() => officialSessionDate(input)).toThrow());
});
