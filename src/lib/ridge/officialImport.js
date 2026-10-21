// Pure staging adapter for published Session Scores, never a database writer.
// Stored official scores are evidence: no durations/points are recalculated.
export const OFFICIAL_HEADERS = Object.freeze([
  "Session Date", "Rider", "L1 Time", "L2 % points", "L3 % points", "L4 % points", "L5 % points",
  "Lap Improvement Score", "Total Laps", "Session Highlight Score", "Total Score",
]);
const blank = value => value == null || (typeof value === "string" && value.trim() === "");
const nameKey = value => value.trim().toLowerCase();

export function officialSessionDate(value) {
  if (typeof value !== "string") throw new Error("Session date must be DD-MM-YYYY text");
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) throw new Error("Session date must be DD-MM-YYYY text");
  const [, day, month, year] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) throw new Error("Invalid calendar date");
  return `${year}-${month}-${day}`;
}

// RFC-style quoted cells, commas, escaped quotes and CRLF; no network/parser dependency.
export function parseOfficialCsv(text) {
  if (typeof text !== "string") throw new Error("CSV must be text");
  const rows = [], row = [];
  let cell = "", quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error("Unexpected CSV quote");
      quoted = true;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ""; closed = false;
      if (c !== ',') { rows.push(row.splice(0)); if (c === '\r' && text[i + 1] === '\n') i++; }
    } else {
      if (closed) throw new Error("Unexpected text after CSV quote");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || closed || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function numeric(value, label, nullable = false) {
  if (blank(value)) { if (nullable) return null; throw new Error(`${label} is required`); }
  if (typeof value !== "number" && typeof value !== "string") throw new Error(`${label} must be numeric`);
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw new Error(`${label} must be a finite decimal`);
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error(`${label} must be finite`);
  return n;
}

/**
 * input: CSV text, header-first matrix, or objects keyed by OFFICIAL_HEADERS.
 * identities: [{ id: stable global ID, name: confirmed display name, aliases: [] }]
 * provenance: { workbookId, sheet, snapshotId } from an authorized snapshot.
 * ready only means internally consistent staging, NOT permission to import/publish.
 */
export function dryRunOfficialImport(input, { identities = [], provenance } = {}) {
  const errors = [], warnings = [], candidates = [];
  const issue = (list, row, code, message) => list.push({ row, code, message });
  const identityMap = new Map();
  const ids = new Set();
  for (const identity of identities) {
    if (!identity || typeof identity.id !== "string" || !identity.id.trim() || typeof identity.name !== "string" || !identity.name.trim() || (identity.aliases != null && !Array.isArray(identity.aliases))) {
      issue(errors, null, "IDENTITY_CONFIG", "Each identity needs a stable ID, name and optional aliases array"); continue;
    }
    if (ids.has(identity.id)) issue(errors, null, "IDENTITY_CONFIG", "Duplicate canonical identity ID");
    ids.add(identity.id);
    for (const alias of [identity.name, ...(identity.aliases || [])]) {
      if (typeof alias !== "string" || !alias.trim()) { issue(errors, null, "IDENTITY_CONFIG", "Alias must be nonempty text"); continue; }
      const key = nameKey(alias);
      if (identityMap.has(key) && identityMap.get(key)?.id !== identity.id) {
        identityMap.set(key, null);
        issue(errors, null, "AMBIGUOUS_ALIAS", "Alias belongs to multiple identities");
      } else if (!identityMap.has(key)) identityMap.set(key, identity);
    }
  }
  const validProvenance = provenance && ["workbookId", "sheet", "snapshotId"].every(k => typeof provenance[k] === "string" && provenance[k].trim());
  if (!validProvenance) issue(errors, null, "PROVENANCE_REQUIRED", "Workbook, sheet and immutable snapshot/version identifier are required");
  let rows;
  try {
    rows = typeof input === "string" ? parseOfficialCsv(input) : input;
    if (!Array.isArray(rows)) throw new Error("Input must be CSV or an array of rows");
    if (Array.isArray(rows[0])) {
      const headers = rows[0].map(h => String(h).trim());
      if (new Set(headers).size !== headers.length || OFFICIAL_HEADERS.some(h => !headers.includes(h))) throw new Error("Missing or duplicate Session Scores headers");
      rows = rows.slice(1).map(row => {
        if (!Array.isArray(row) || row.length !== headers.length) {
          if (Array.isArray(row) && row.every(blank)) return null;
          throw new Error("CSV row width does not match header");
        }
        return Object.fromEntries(headers.map((h, i) => [h, row[i]]));
      });
    }
  } catch (error) {
    issue(errors, null, "INPUT_SCHEMA", error.message);
    return { ready: false, records: [], errors, warnings };
  }
  rows.forEach((row, index) => {
    const sourceRow = index + 2;
    if (row === null || (row && Object.keys(row).length > 0 && Object.values(row).every(blank))) return;
    try {
      if (!row || typeof row !== "object" || Array.isArray(row) || OFFICIAL_HEADERS.some(h => !Object.hasOwn(row, h))) throw new Error("Row is missing Session Scores fields");
      const session_date = officialSessionDate(row["Session Date"]);
      if (typeof row.Rider !== "string" || !row.Rider.trim()) throw new Error("Rider name is required");
      const source_name = row.Rider.trim();
      const identity = identityMap.get(nameKey(source_name));
      const lap_points = [null, ...OFFICIAL_HEADERS.slice(3, 7).map(h => numeric(row[h], h, true))];
      const improvement = numeric(row["Lap Improvement Score"], "Improvement", true);
      const completed_laps = numeric(row["Total Laps"], "Completed laps");
      if (!Number.isInteger(completed_laps) || completed_laps < 0 || completed_laps > 5) throw new Error("Completed laps must be an integer from 0 to 5");
      const highlight_score = numeric(row["Session Highlight Score"], "Highlight score");
      const total_score = numeric(row["Total Score"], "Total score");
      const record = {
        session_date, source_date: row["Session Date"].trim(), source_name,
        athlete_id: identity?.id || null, athlete_name: identity?.name || source_name,
        identity_unresolved: !identity, lap_points, improvement, completed_laps, highlight_score, total_score,
        l1_time: blank(row["L1 Time"]) ? null : String(row["L1 Time"]),
        score_source: "official-published", provenance: validProvenance ? { ...provenance, sourceRow } : null,
      };
      if (!identity) issue(errors, sourceRow, "UNRESOLVED_IDENTITY", "Confirm a stable identity or explicit alias before import");
      if (improvement === null) issue(warnings, sourceRow, "TOTAL_UNVERIFIABLE", "Improvement is missing; official total preserved, not recomputed");
      else if (Math.abs(total_score - (improvement + completed_laps + highlight_score)) > 0.011 + Number.EPSILON * 100) issue(errors, sourceRow, "TOTAL_MISMATCH", "Published total differs from improvement + completed laps + highlight");
      candidates.push({ record, sourceRow, key: `${session_date}|${identity ? `id:${identity.id}` : `name:${nameKey(source_name)}`}` });
    } catch (error) { issue(errors, sourceRow, "INVALID_ROW", error.message); }
  });
  const counts = new Map();
  candidates.forEach(c => counts.set(c.key, (counts.get(c.key) || 0) + 1));
  const records = candidates.filter(c => {
    if (counts.get(c.key) === 1) return true;
    issue(errors, c.sourceRow, "DUPLICATE_RIDER_DATE", "Multiple rows resolve to the same rider and session date; neither is accepted"); return false;
  }).map(c => c.record);
  if (!records.length && !errors.length) issue(errors, null, "EMPTY_SNAPSHOT", "No score records found");
  return { ready: errors.length === 0 && warnings.length === 0, records, errors, warnings };
}

// Explicit opt-in preview transformation. It never saves, publishes or changes
// the configured feed. Refuse a partial/invalid dry-run rather than show it.
export function officialRecordsToFeedInput(dryRun) {
  if (!dryRun?.ready || dryRun.errors?.length || dryRun.warnings?.length || !Array.isArray(dryRun.records) || !dryRun.records.length) {
    throw new Error("A complete, ready official dry-run is required for preview");
  }
  const dates = [...new Set(dryRun.records.map(r => r.session_date))].sort();
  return {
    sessions: dates.map(date => ({ slug: `official-${date}`, name: `Official session ${date}`, session_date: date })),
    results: dryRun.records.map(r => ({ ...r, lap_points: [...r.lap_points],
      id: `official:${r.session_date}:${encodeURIComponent(r.athlete_id)}`, session_slug: `official-${r.session_date}` })),
    awards: [], spotlights: [],
  };
}
