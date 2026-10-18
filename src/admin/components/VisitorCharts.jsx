import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, axisTop, dayLabel, stackLayers, visitsOn } from "../visitorStats";

// Hand-drawn SVG charts for Admin → Visitors. No chart library: the shapes
// are simple, and plain SVG keeps the bundle small. Conventions (dataviz
// skill): 2px lines, 2px surface gaps between filled shapes, recessive grid,
// values always in text colour beside a colour swatch, hover on every chart.

const GRID_LINES = 4;
const SURFACE = "#ffffff";
const INK = "#17121f";
const MUTED = "#6d6772";

// Width of a container, kept current — SVGs are drawn in real pixels so text
// and 2px strokes stay crisp at every size.
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function Legend({ sums }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {GROUPS.map((g) => (
        <span key={g.key} className="inline-flex items-center gap-2 text-xs text-rtg-mist">
          <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />
          {g.label}
          {sums && <b className="tabular-nums text-rtg-white">{sums[g.key]}</b>}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ day, style }) {
  return (
    <div
      className="pointer-events-none absolute z-10 w-56 rounded-xl border border-rtg-border bg-white p-3 text-left shadow-[0_18px_40px_-18px_rgba(53,36,111,0.45)]"
      style={style}
    >
      <p className="mb-2 text-xs font-semibold text-rtg-white">{dayLabel(day.day, { weekday: "short", day: "numeric", month: "short" })}</p>
      {[...GROUPS].reverse().map((g) => (
        <p key={g.key} className="flex items-center gap-2 text-xs text-rtg-mist">
          <i className="h-2 w-2 rounded-[2px]" style={{ background: g.color }} />
          <span className="flex-1">{g.label}</span>
          <b className="tabular-nums text-rtg-white">{day[g.key]}</b>
        </p>
      ))}
      <p className="mt-1.5 flex gap-2 border-t border-rtg-border pt-1.5 text-xs text-rtg-mist">
        <span className="flex-1">All visits · different people</span>
        <b className="tabular-nums text-rtg-white">
          {visitsOn(day)} · {day.people}
        </b>
      </p>
    </div>
  );
}

function YAxis({ top, height }) {
  return (
    <div className="flex flex-col justify-between text-right text-[10px] tabular-nums text-rtg-mist" style={{ height }}>
      {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
        <span key={i} className="leading-none">
          {Math.round(top - (top / GRID_LINES) * i)}
        </span>
      ))}
    </div>
  );
}

function XLabels({ days }) {
  const everyNth = Math.max(1, Math.ceil(days.length / 6));
  return (
    <div className="mt-2 flex">
      {days.map((day, i) => (
        <span key={day.day} className="min-w-0 flex-1 whitespace-nowrap text-center text-[10px] text-rtg-mist">
          {(days.length - 1 - i) % everyNth === 0 ? dayLabel(day.day) : ""}
        </span>
      ))}
    </div>
  );
}

// Stacked area: members at the bottom, then "looked and left", then
// "browsed". Hover shows a crosshair, a dot on each layer and the numbers.
export function StackedArea({ days, height = 260 }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);
  const layers = useMemo(() => stackLayers(days), [days]);
  const top = axisTop(Math.max(...days.map(visitsOn), 1), GRID_LINES);
  const n = days.length;
  const x = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v) => height - (v / top) * height;

  const area = (points) => {
    const upper = points.map((p, i) => `${x(i)},${y(p.high)}`);
    const lower = points.map((p, i) => `${x(i)},${y(p.low)}`).reverse();
    return `M${upper.join("L")}L${lower.join("L")}Z`;
  };
  const edge = (points) => `M${points.map((p, i) => `${x(i)},${y(p.high)}`).join("L")}`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(rect.width, 1);
    setActive(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };

  return (
    <div className="flex gap-3">
      <YAxis top={top} height={height} />
      <div className="relative min-w-0 flex-1">
        <div ref={ref} className="relative" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} className="block overflow-visible" role="img" aria-label="Visits per day, stacked by kind of visit">
              {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
                <line key={i} x1={0} x2={width} y1={(height / GRID_LINES) * i} y2={(height / GRID_LINES) * i} stroke="rgba(53,36,111,0.08)" />
              ))}
              {layers.map((l) => (
                <path key={l.key} d={area(l.points)} fill={l.color} fillOpacity={0.9} />
              ))}
              {/* 2px surface gap between the stacked layers */}
              {layers.map((l) => (
                <path key={`${l.key}-edge`} d={edge(l.points)} fill="none" stroke={SURFACE} strokeWidth={2} strokeLinejoin="round" />
              ))}
              {active !== null && (
                <g>
                  <line x1={x(active)} x2={x(active)} y1={0} y2={height} stroke={INK} strokeOpacity={0.35} strokeDasharray="3 3" />
                  {layers.map((l) =>
                    l.points[active].high > l.points[active].low ? (
                      <circle key={l.key} cx={x(active)} cy={y(l.points[active].high)} r={4.5} fill={l.color} stroke={SURFACE} strokeWidth={2} />
                    ) : null
                  )}
                </g>
              )}
            </svg>
          )}
          <div
            className="absolute inset-0 cursor-crosshair"
            onMouseMove={onMove}
            onMouseLeave={() => setActive(null)}
            onTouchStart={(e) => onMove(e.touches[0] ? { ...e, clientX: e.touches[0].clientX, currentTarget: e.currentTarget } : e)}
            aria-hidden="true"
          />
          {active !== null && (
            <Tooltip
              day={days[active]}
              style={{ bottom: "calc(100% + 8px)", left: `clamp(0px, ${x(active) - 112}px, calc(100% - 224px))` }}
            />
          )}
        </div>
        <XLabels days={days} />
      </div>
    </div>
  );
}

// The same data as stacked bars — one per day, 2px gaps between segments.
export function StackedBars({ days, height = 260 }) {
  const [active, setActive] = useState(null);
  const top = axisTop(Math.max(...days.map(visitsOn), 1), GRID_LINES);
  return (
    <div className="flex gap-3">
      <YAxis top={top} height={height} />
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }} aria-hidden="true">
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
            <span key={i} className="block h-px bg-rtg-border" />
          ))}
        </div>
        <div className="relative flex items-end" style={{ height }} onMouseLeave={() => setActive(null)}>
          {days.map((day, i) => {
            const parts = GROUPS.filter((g) => day[g.key] > 0);
            return (
              <button
                key={day.day}
                type="button"
                className={`relative flex h-full min-w-0 flex-1 flex-col-reverse items-center gap-[2px] rounded-t-md transition-colors ${active === i ? "bg-rtg-purple-950/5" : ""}`}
                aria-label={`${dayLabel(day.day, { weekday: "long", day: "numeric", month: "long" })}: ${GROUPS.map((g) => `${day[g.key]} ${g.label}`).join(", ")}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {parts.map((g, k) => (
                  <span
                    key={g.key}
                    className={`block w-[70%] max-w-6 ${k === parts.length - 1 ? "rounded-t-[4px]" : ""}`}
                    style={{ height: `${(day[g.key] / top) * 100}%`, background: g.color }}
                  />
                ))}
              </button>
            );
          })}
          {active !== null && (
            <Tooltip
              day={days[active]}
              style={{ bottom: "calc(100% + 8px)", left: `clamp(0px, calc(${((active + 0.5) / days.length) * 100}% - 112px), calc(100% - 224px))` }}
            />
          )}
        </div>
        <XLabels days={days} />
      </div>
    </div>
  );
}

// Share of each kind of visit, with the total in the middle. Hovering a
// slice or its legend row highlights it.
export function VisitDonut({ sums, size = 200 }) {
  const [active, setActive] = useState(null);
  const total = sums.visits || 0;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const gap = total ? 2 : 0; // 2px surface gap between slices
  let offset = 0;
  const slices = GROUPS.map((g) => {
    const value = sums[g.key] || 0;
    const length = total ? (value / total) * c : 0;
    const slice = { ...g, value, length, offset };
    offset += length;
    return slice;
  });
  const shown = active ? slices.find((s) => s.key === active) : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Share of visits by kind">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(53,36,111,0.07)" strokeWidth={22} />
          {slices.map((s) =>
            s.length > 0 ? (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? 28 : 22}
                strokeDasharray={`${Math.max(s.length - gap, 0.5)} ${c}`}
                strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-width 150ms" }}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              />
            ) : null
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-4xl leading-none text-rtg-white">{shown ? shown.value : total}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rtg-mist">{shown ? shown.short : "visits"}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${active === s.key ? "bg-rtg-purple-950/5" : ""}`}
          >
            <i className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="flex-1 text-sm text-rtg-mist">{s.label}</span>
            <b className="tabular-nums text-sm text-rtg-white">{total ? Math.round((s.value / total) * 100) : 0}%</b>
            <span className="w-10 text-right text-xs tabular-nums text-rtg-mist">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Average visits per weekday — one hue (magnitude), the busiest day labelled.
export function WeekdayBars({ weekdays, height = 150 }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...weekdays.map((d) => d.average), 0);
  const busiest = max > 0 ? weekdays.findIndex((d) => d.average === max) : -1;
  return (
    <div>
      <div className="flex items-end gap-2 pt-5" style={{ height }} onMouseLeave={() => setActive(null)}>
        {weekdays.map((d, i) => {
          const pct = max ? (d.average / max) * 100 : 0;
          const highlight = i === busiest || i === active;
          return (
            <button
              key={d.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${d.average.toFixed(1)} visits on average (${d.samples} day${d.samples === 1 ? "" : "s"} in range)`}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {/* Label floats above the bar so it never steals bar height. */}
              {(i === active || (active === null && i === busiest)) && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums text-rtg-white"
                  style={{ bottom: `calc(${Math.max(pct, d.average ? 3 : 0)}% + 4px)` }}
                >
                  {d.average.toFixed(1)}
                </span>
              )}
              <span
                className="block w-full max-w-10 rounded-t-[4px] transition-colors"
                style={{ height: `${Math.max(pct, d.average ? 3 : 0)}%`, background: highlight ? "#2a78d6" : "rgba(42,120,214,0.35)" }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {weekdays.map((d, i) => (
          <span key={d.label} className={`flex-1 text-center text-[11px] ${i === busiest ? "font-bold text-rtg-white" : "text-rtg-mist"}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Tiny trend line for a stat tile — single series, so no legend.
export function Sparkline({ values, width = 120, height = 36, color = "#5e43a1" }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const n = values.length;
  const px = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * (width - 4) + 2);
  const py = (v) => height - 3 - (v / max) * (height - 6);
  const line = values.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <polygon points={`${px(0)},${height} ${line} ${px(n - 1)},${height}`} fill={color} fillOpacity={0.1} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(n - 1)} cy={py(values[n - 1])} r={3.5} fill={color} stroke={SURFACE} strokeWidth={2} />
    </svg>
  );
}

// Most opened pages, ranked, each with its count and share.
export function TopPages({ pages }) {
  const most = Math.max(...pages.map((p) => p.views), 1);
  const all = pages.reduce((s, p) => s + p.views, 0) || 1;
  return (
    <ol className="space-y-3">
      {pages.map((p, i) => (
        <li key={p.path} className="grid grid-cols-[1.5rem_minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] font-bold ${i === 0 ? "bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white" : "bg-rtg-purple-950/5 text-rtg-mist"}`}>
            {i + 1}
          </span>
          <span className="truncate text-rtg-white" title={p.path}>
            {p.path === "/" ? "Home" : p.path}
          </span>
          <span className="block h-2.5 overflow-hidden rounded-full bg-rtg-purple-950/[0.05]">
            <i className="block h-full rounded-full" style={{ width: `${(p.views / most) * 100}%`, minWidth: 4, background: "#2a78d6" }} />
          </span>
          <span className="text-right">
            <b className="tabular-nums text-rtg-white">{p.views}</b>
            <span className="ml-1.5 text-[11px] tabular-nums" style={{ color: MUTED }}>
              {Math.round((p.views / all) * 100)}%
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
