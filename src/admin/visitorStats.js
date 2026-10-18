// Number crunching for Admin → Visitors, kept free of React so it can be
// tested on its own. Input is the `days` array from site_traffic():
//   [{ day: "2026-10-18", left, browsed, members, people }, …]  oldest first

// The three kinds of visit. Colours were run through the colour-blindness
// validator together (dataviz skill): adjacent pairs clear ΔE 9 for CVD.
// Green sits under 3:1 contrast on white, so the page keeps a table view and
// always prints the numbers beside the colours.
export const GROUPS = [
  { key: "members", label: "Logged-in members", short: "Members", color: "#2a78d6" },
  { key: "left", label: "Looked and left", short: "Left quickly", color: "#eb6834" },
  { key: "browsed", label: "Browsed without logging in", short: "Browsed", color: "#1baf7a" },
];

export const dayLabel = (iso, options = { day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", options);

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const visitsOn = (day) => GROUPS.reduce((sum, g) => sum + (Number(day?.[g.key]) || 0), 0);

export function sumGroups(days) {
  const out = Object.fromEntries(GROUPS.map((g) => [g.key, 0]));
  for (const d of days) for (const g of GROUPS) out[g.key] += Number(d[g.key]) || 0;
  out.visits = GROUPS.reduce((s, g) => s + out[g.key], 0);
  return out;
}

// site_traffic() is asked for twice the range; the older half is "the
// period before", the newer half is the one on screen.
export function splitPeriods(days, range) {
  const current = days.slice(-range);
  const previous = days.slice(-2 * range, -range);
  return { current, previous };
}

// Percentage change, or null when there's nothing to compare against.
export function percentChange(now, before) {
  if (!before) return now ? null : 0;
  return Math.round(((now - before) / before) * 100);
}

// Average visits per weekday (Mon–Sun) across the given days, plus how many
// of each weekday were in the sample, so a 7-day range still reads honestly.
export function weekdayAverages(days) {
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const d of days) {
    const date = new Date(`${d.day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const idx = (date.getUTCDay() + 6) % 7; // Monday = 0
    totals[idx] += visitsOn(d);
    counts[idx] += 1;
  }
  return WEEKDAYS.map((label, i) => ({ label, average: counts[i] ? totals[i] / counts[i] : 0, samples: counts[i] }));
}

// The smallest round number (4, 8, 20, 40, 80, 200 …) the tallest value
// fits under, so the 4 grid lines land on whole visits.
export function axisTop(max, gridLines = 4) {
  if (!(max > 0)) return gridLines;
  for (let step = 1; ; step *= 10) {
    const top = [1, 2, 5].map((m) => m * step * gridLines).find((t) => t >= max);
    if (top) return top;
  }
}

// Cumulative layers for a stacked chart, bottom layer first:
// [{ key, color, points: [{ low, high }, …] }, …]
export function stackLayers(days) {
  const base = days.map(() => 0);
  return GROUPS.map((g) => {
    const points = days.map((d, i) => {
      const low = base[i];
      const high = low + (Number(d[g.key]) || 0);
      base[i] = high;
      return { low, high };
    });
    return { ...g, points };
  });
}
