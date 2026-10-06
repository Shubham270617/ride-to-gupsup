import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "../components/ui/Reveal";
import { useEvents, useSiteSettings, buildEventsPageCopy } from "../lib/publicData";
import { splitTitle } from "../lib/format";

// ============================================================================
// EVENTS PAGE — the "event board" design: an Event Pulse carousel in the
// hero, then a spotlight + rail + grid of every event.
//
// Nothing here is written in code: the events are the rows of the `events`
// table (Admin -> Events) and every heading, label and paragraph comes from
// Admin -> Site Content -> Events ("text.events.<field>"). What an event row
// supplies to the board:
//   Title, Description          -> the card / spotlight text
//   Category (event_status)     -> the filter pill it falls under + big label
//   Type                        -> the small coloured line on its card
//   Date                        -> its status line ("Coming Soon", "Saturdays")
//   Homepage pills              -> the three pills in the spotlight
//   Colour                      -> its accent colours (see TONES below)
// ============================================================================

// Accent colours an event can be given (Admin -> Events -> "Colour"): three
// stops for the spotlight, the first two for cards and the rail. An event
// with no colour set takes the next one in this order.
const TONES = {
  sunset: ["#ff6b57", "#ff4fa3", "#ffc83d"],
  electric: ["#23c8ff", "#4668ff", "#865cff"],
  trail: ["#9be34a", "#2bd8a4", "#23c8ff"],
  blue: ["#23c8ff", "#5968ff", "#7b5cff"],
  warm: ["#ff6257", "#ffc83d", "#ff9a38"],
  mint: ["#2bd8a4", "#20b9d4", "#5968ff"],
  future: ["#865cff", "#ff4fa3", "#23c8ff"],
};
const TONE_ORDER = Object.keys(TONES);

// How many events the hero's Event Pulse carousel cycles through.
const HERO_EVENT_COUNT = 3;
const HERO_ADVANCE_MS = 4600;
const ALL = "all";

const pad2 = (n) => String(n).padStart(2, "0");

// One `events` row in the shape the board draws.
function toBoardItem(event, i) {
  const tone = TONES[event.tone] ? event.tone : TONE_ORDER[i % TONE_ORDER.length];
  return {
    id: event.id,
    path: `/events/${event.slug || event.id}`,
    number: pad2(i + 1),
    colors: TONES[tone],
    kind: event.status,
    eyebrow: event.type || event.status,
    status: event.date,
    title: event.title,
    description: event.desc,
    meta: event.home.pills.length ? event.home.pills : [event.date, ...(event.categories || [])].filter(Boolean),
    accent: event.home.titleAccent,
  };
}

// ----------------------------------------------------------------------------
// HERO — headline on the left, "Event Pulse" card stack + auto-advancing
// carousel on the right (the first few events of the board).
// ----------------------------------------------------------------------------
function EventsHero({ copy, items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const goTo = (i) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), HERO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  const current = items[index % Math.max(count, 1)];
  const signals = copy.signals.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <section className="relative isolate overflow-hidden bg-rtg-canvas pt-32 pb-20 md:pt-40 md:pb-28 px-6 md:px-10">
      <div className={`relative max-w-7xl mx-auto grid gap-14 lg:gap-10 items-center ${count ? "lg:grid-cols-[1fr_1fr]" : ""}`}>
        {/* LEFT — eyebrow / three-line title / copy / signal tags */}
        <Reveal direction="right">
          <div className="flex items-center gap-3 mb-5 text-[9px] font-extrabold tracking-[0.16em] uppercase">
            <span className="text-[#ff4f7a]">{copy.indexLabel}</span>
            <b className="pl-3 border-l border-rtg-mist/30 font-bold text-rtg-mist">{copy.indexYear}</b>
          </div>

          <span className="block text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#27348b] mb-3">{copy.eyebrow}</span>

          <h1 className="uppercase max-w-[720px]">
            <span className="block font-sans font-black leading-[0.94] tracking-[-0.052em] text-[clamp(38px,4.75vw,78px)] text-[#27348b]">
              {copy.titleLine1}
            </span>
            <span className="block font-sans font-black leading-[0.90] tracking-[-0.062em] text-[clamp(42px,5.7vw,92px)] mt-2 bg-clip-text text-transparent bg-[linear-gradient(90deg,#25c3ff_0%,#4f7dff_22%,#7d5cff_48%,#c75dff_72%,#ff5f95_100%)]">
              {copy.titleLine2}
            </span>
            <span className="block font-sans font-black leading-[0.91] tracking-[-0.058em] text-[clamp(40px,5.45vw,88px)] mt-3 bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff8a38_0%,#ff5f57_22%,#ff4fa3_45%,#a85cff_68%,#35cfff_100%)]">
              {copy.titleLine3}
            </span>
          </h1>

          <p className="max-w-[610px] mt-7 text-rtg-mist text-[15px] font-medium leading-[1.68]">{copy.intro}</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-7">
            {signals.map((s) => (
              <span key={s} className="inline-flex items-center gap-2.5 text-[8.5px] font-extrabold tracking-[0.1em] uppercase text-rtg-mist">
                <i className="w-1.5 h-1.5 rounded-full bg-[#7b5cff] ring-4 ring-[#7b5cff]/15 inline-block" />
                {s}
              </span>
            ))}
          </div>
        </Reveal>

        {/* RIGHT — Event Pulse stage */}
        {count > 0 && (
          <Reveal direction="left" delay={0.1}>
            <div
              className="relative rounded-[34px] border border-white bg-white/60 backdrop-blur-xl p-4 sm:p-6 shadow-[0_30px_80px_rgba(70,104,255,0.14)] bg-[radial-gradient(circle_at_85%_12%,rgba(35,200,255,0.12),transparent_38%),radial-gradient(circle_at_80%_95%,rgba(255,79,163,0.12),transparent_40%)]"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="flex items-center justify-between mb-8 sm:mb-14 text-[8px] sm:text-[9px] font-bold tracking-[0.18em] uppercase">
                <span className="text-rtg-mist">{copy.pulseLabel}</span>
                <b className="text-rtg-purple-600 tracking-[0.12em]">
                  {pad2(index + 1)} / {pad2(count)}
                </b>
              </div>

              <div className="grid grid-flow-col auto-cols-fr items-end gap-2.5 sm:gap-4 mb-4">
                {items.map((card, i) => {
                  const [line1, line2] = splitTitle(card.title, card.accent);
                  const active = i === index;
                  const [a, b] = card.colors;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => goTo(i)}
                      className={`relative flex flex-col text-left rounded-[22px] p-3 sm:p-[18px] border transition-all duration-300 min-h-[150px] sm:min-h-[236px] ${
                        active ? "bg-white -translate-y-2.5" : "border-white bg-white/55 hover:bg-white/80"
                      }`}
                      style={
                        active
                          ? { borderColor: `${a}55`, boxShadow: `0 22px 44px ${a}26`, background: `radial-gradient(circle at 88% 10%, ${a}22, transparent 42%), #fff` }
                          : { background: `radial-gradient(circle at 88% 10%, ${a}14, transparent 42%), rgba(255,255,255,.55)` }
                      }
                    >
                      <span className="block font-display text-[28px] sm:text-[40px] leading-none" style={{ color: `${a}66` }}>
                        {card.number}
                      </span>
                      <span className="block mt-2 sm:mt-3 text-[7px] sm:text-[8px] font-extrabold tracking-[0.16em] uppercase" style={{ color: a }}>
                        {card.kind}
                      </span>
                      <span
                        className="absolute top-3 right-3 sm:top-[18px] sm:right-[18px] w-6 h-6 sm:w-8 sm:h-8 rounded-full grid place-items-center text-xs sm:text-sm transition-colors"
                        style={active ? { background: `linear-gradient(135deg, ${a}, ${b})`, color: "#fff" } : { color: "#3d316e" }}
                      >
                        →
                      </span>
                      <strong className="block mt-auto pt-4 font-display font-normal text-lg sm:text-[28px] leading-[1.02] text-[#3d316e]">
                        {line1}
                        {line2 && (
                          <>
                            <br />
                            {line2}
                          </>
                        )}
                      </strong>
                      {card.status && (
                        <small className="block mt-2 text-[6.5px] sm:text-[7.5px] font-bold tracking-[0.1em] uppercase text-rtg-mist truncate">{card.status}</small>
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="relative rounded-[26px] bg-white/80 border border-white p-4 sm:p-5 flex items-center gap-4 sm:gap-[18px] min-h-[104px] sm:min-h-[142px] overflow-hidden"
                >
                  {/* Orbit motion accent */}
                  <div className="hidden sm:block absolute -right-6 -top-6 w-24 h-24 pointer-events-none opacity-70">
                    <div className="absolute inset-0 rounded-full border border-rtg-purple-300/30" style={{ animation: "rtg-orbit-spin 19s linear infinite" }} />
                    <div className="absolute inset-3 rounded-full border border-rtg-orange-400/30" style={{ animation: "rtg-orbit-spin-reverse 15s linear infinite" }} />
                  </div>
                  <div className="w-12 h-12 sm:w-[70px] sm:h-[70px] rounded-2xl sm:rounded-[22px] bg-[linear-gradient(135deg,#4668ff,#865cff)] text-white flex items-center justify-center font-display text-xl sm:text-[28px] shrink-0 relative z-10 shadow-[0_14px_28px_rgba(70,104,255,0.28)]">
                    {current.number}
                  </div>
                  <div className="min-w-0 relative z-10">
                    <span className="block text-[7.5px] sm:text-[8px] font-extrabold tracking-[0.16em] uppercase text-[#ff4fa3] mb-1.5">
                      {[current.eyebrow, current.status].filter(Boolean).join(" • ")}
                    </span>
                    <strong className="block text-sm sm:text-[15px] font-extrabold uppercase text-[#27348b] leading-tight">{current.title}</strong>
                    {current.description && <p className="text-[10px] sm:text-[11px] text-rtg-mist mt-1.5 leading-snug line-clamp-3">{current.description}</p>}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center gap-4 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  aria-label={copy.prevLabel}
                  className="w-10 h-10 rounded-full border border-white bg-white/80 shadow-[0_8px_18px_rgba(70,104,255,0.12)] flex items-center justify-center text-[#4668ff] hover:bg-white transition-colors shrink-0"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="flex-1 h-px bg-[rgba(70,104,255,0.18)] overflow-hidden">
                  <motion.span
                    key={index}
                    className="block h-full bg-[linear-gradient(90deg,#ff4fa3,#4668ff)]"
                    initial={{ width: "0%" }}
                    animate={{ width: paused ? undefined : "100%" }}
                    transition={{ duration: HERO_ADVANCE_MS / 1000, ease: "linear" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label={copy.nextLabel}
                  className="w-10 h-10 rounded-full border border-white bg-white/80 shadow-[0_8px_18px_rgba(70,104,255,0.12)] flex items-center justify-center text-[#4668ff] hover:bg-white transition-colors shrink-0"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// MAIN PAGE — "Find Your Next Start Line" (filter + spotlight + rail) and
// "Browse the Board" (full grid).
// ----------------------------------------------------------------------------
export default function Events() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildEventsPageCopy(settings), [settings]);
  const events = useEvents();
  const items = useMemo(() => events.map(toBoardItem), [events]);

  // One filter per category that actually has events, in first-seen order.
  const filters = useMemo(() => {
    const counts = new Map();
    items.forEach((e) => counts.set(e.kind, (counts.get(e.kind) || 0) + 1));
    return [{ key: ALL, label: copy.allLabel, count: items.length }, ...[...counts].map(([kind, count]) => ({ key: kind, label: kind, count }))];
  }, [items, copy.allLabel]);

  const [filterKind, setFilterKind] = useState(ALL);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightRef = useRef(null);

  const visible = (item) => filterKind === ALL || item.kind === filterKind;

  const selectSpotlight = (i, { scroll = false } = {}) => {
    setSpotlightIndex(i);
    if (scroll) spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleFilter = (key) => {
    setFilterKind(key);
    const firstVisible = items.findIndex((e) => key === ALL || e.kind === key);
    if (firstVisible >= 0) setSpotlightIndex(firstVisible);
  };

  const spotlight = items[spotlightIndex] || items[0];

  return (
    <>
      <EventsHero copy={copy} items={items.slice(0, HERO_EVENT_COUNT)} />

      <section className="relative isolate overflow-hidden bg-rtg-canvas py-16 md:py-20 px-6 md:px-10" ref={spotlightRef}>
        <div className="relative max-w-7xl mx-auto">
          {/* Editorial head */}
          <Reveal className="flex items-end gap-5 pb-6 mb-10 border-b border-rtg-border">
            <div className="shrink-0">
              <span className="block font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-[0.8] text-rtg-purple-600/20">{copy.sectionNumber}</span>
              <small className="block text-[10px] font-bold tracking-widest uppercase text-rtg-mist mt-1">{copy.sectionLabel}</small>
            </div>
            <div>
              <span className="block text-[11px] font-bold tracking-[0.2em] uppercase text-rtg-orange-500 mb-2">{copy.kicker}</span>
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95]">
                {copy.heading} <span className="text-gradient">{copy.headingAccent}</span>
              </h2>
              <p className="text-rtg-mist text-base max-w-xl mt-3">{copy.body}</p>
            </div>
          </Reveal>

          {!spotlight ? (
            <p className="text-center text-rtg-mist py-10">{copy.emptyText}</p>
          ) : (
            <>
              {/* Filter pills */}
              <Reveal className="flex flex-wrap items-center gap-2 mb-10">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleFilter(f.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${
                      filterKind === f.key ? "bg-rtg-purple-600 text-white" : "glass text-rtg-mist hover:text-rtg-purple-600"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] ${
                        filterKind === f.key ? "bg-white/20" : "bg-rtg-purple-950/8"
                      }`}
                    >
                      {pad2(f.count)}
                    </span>
                  </button>
                ))}
              </Reveal>

              {/* Spotlight + rail */}
              <Reveal className="grid lg:grid-cols-[1fr_360px] gap-6 mb-16">
                <AnimatePresence mode="wait">
                  <motion.article
                    key={spotlight.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden rounded-[28px] border border-rtg-border p-6 md:p-10 min-h-[320px] flex flex-col justify-center"
                    style={{
                      background: `radial-gradient(circle at 92% 7%, ${spotlight.colors[0]}14, transparent 25%), radial-gradient(circle at 6% 94%, ${spotlight.colors[2]}10, transparent 30%), #ffffff`,
                    }}
                  >
                    {/* Orbit motion accent */}
                    <div aria-hidden="true" className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 pointer-events-none opacity-60">
                      <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${spotlight.colors[0]}30`, animation: "rtg-orbit-spin 19s linear infinite" }} />
                      <div className="absolute inset-6 rounded-full border" style={{ borderColor: `${spotlight.colors[1]}30`, animation: "rtg-orbit-spin-reverse 15s linear infinite" }} />
                      <span className="rtg-pulse-dot absolute left-0 top-0 w-2 h-2 rounded-full" style={{ background: spotlight.colors[0] }} />
                      <span className="rtg-pulse-dot absolute right-2 bottom-4 w-1.5 h-1.5 rounded-full" style={{ background: spotlight.colors[2], animationDelay: "1s" }} />
                    </div>

                    <div className="relative flex items-start gap-4 md:gap-5">
                      <div className="shrink-0">
                        <span className="block font-display text-5xl leading-none" style={{ color: spotlight.colors[0] }}>
                          {spotlight.number}
                        </span>
                        <small className="block text-[10px] font-bold tracking-widest uppercase text-rtg-mist mt-1">{spotlight.kind}</small>
                      </div>
                      <div className="min-w-0">
                        {spotlight.status && (
                          <span
                            className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full text-white mb-3"
                            style={{ background: `linear-gradient(90deg, ${spotlight.colors[0]}, ${spotlight.colors[1]})` }}
                          >
                            {spotlight.status}
                          </span>
                        )}
                        <h3 className="font-display text-3xl md:text-5xl text-rtg-purple-700 leading-[0.95]">{spotlight.title}</h3>
                        {spotlight.description && <p className="text-rtg-mist text-sm md:text-base max-w-lg mt-3 leading-relaxed">{spotlight.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-5">
                          {spotlight.meta.map((m) => (
                            <span key={m} className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rtg-purple-950/5 text-rtg-purple-600">
                              {m}
                            </span>
                          ))}
                        </div>
                        <Link
                          to={spotlight.path}
                          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase text-white transition-transform hover:-translate-y-0.5"
                          style={{ background: `linear-gradient(90deg, ${spotlight.colors[0]}, ${spotlight.colors[1]})` }}
                        >
                          {copy.viewLabel}
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                </AnimatePresence>

                {/* Rail */}
                <div className="flex flex-col gap-2.5">
                  {items.map((e, i) => {
                    if (!visible(e)) return null;
                    const [a, b] = e.colors;
                    const active = i === spotlightIndex;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => selectSpotlight(i)}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all border ${
                          active ? "border-transparent shadow-[0_10px_24px_rgba(53,36,111,0.08)]" : "border-rtg-border bg-white hover:bg-rtg-purple-950/[0.02]"
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${active ? a : `${a}c2`}, ${active ? b : `${b}c2`})` }}
                        >
                          {e.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <b className="block text-sm text-rtg-purple-700 truncate">{e.title}</b>
                          <small className="block text-xs text-rtg-mist truncate">{[e.kind, e.status].filter(Boolean).join(" • ")}</small>
                        </div>
                        <i className="not-italic shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ color: a, background: `${a}11` }}>
                          →
                        </i>
                      </button>
                    );
                  })}
                </div>
              </Reveal>

              {/* Browse the board */}
              <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 mb-8 border-b border-[rgba(70,104,255,.10)]">
                <span className="font-display text-2xl md:text-3xl bg-clip-text text-transparent bg-[linear-gradient(90deg,#23c8ff,#5968ff,#ff4fa3)]">
                  {copy.boardHeading}
                </span>
                <p className="text-rtg-mist text-sm">{copy.boardHint}</p>
              </Reveal>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((e, i) => {
                  // The first event is already the default spotlight above.
                  if (i === 0 || !visible(e)) return null;
                  const [a, b] = e.colors;
                  return (
                    <motion.article
                      key={e.id}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      onClick={() => selectSpotlight(i, { scroll: true })}
                      className="relative overflow-hidden rounded-3xl border p-6 cursor-pointer bg-white"
                      style={{
                        borderColor: `${a}22`,
                        background: `radial-gradient(circle at 92% 7%, ${a}1f, transparent 25%), linear-gradient(180deg, #ffffff, #ffffff)`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: a }}>
                          {e.eyebrow}
                        </span>
                        <b className="font-display text-2xl text-rtg-purple-950/15">{e.number}</b>
                      </div>
                      <h3 className="font-display text-2xl text-rtg-purple-700 leading-tight mb-2">{e.title}</h3>
                      <p className="text-rtg-mist text-sm leading-relaxed mb-6 line-clamp-4">{e.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wide uppercase text-rtg-mist">{e.status}</span>
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                          style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                        >
                          →
                        </span>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
