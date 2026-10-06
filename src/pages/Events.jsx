import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "../components/ui/Reveal";

// ============================================================================
// EVENTS PAGE — reproduced exactly from the approved reference (video +
// RTG_EVENTS.txt), replacing the previous Signature/Coming-Up/Past design.
//
// This is deliberately static, curated "2026—27 event plan" content (hero
// carousel data + the 7-item event board), not derived from the live
// `events` table — the reference itself has no data wiring, it's a fixed
// editorial board (flagship races, a virtual league, and several weekly
// community formats like Ridge Repeats / Brick & Burn, side by side). See
// the final implementation report for why this wasn't connected to
// useEvents()/useWeeklySessions() instead.
// ============================================================================

// ---- Hero "Event Pulse" carousel data (3 items) — exact copy from heroData ----
const HERO_DATA = [
  {
    num: "01",
    label: "FLAGSHIP • COMING SOON",
    title: "RTG MTB CHALLENGE 2026",
    text: "A mountain-bike race concept built around endurance, handling, challenge and community.",
  },
  {
    num: "02",
    label: "PAN-INDIA • VIRTUAL",
    title: "ENDURANCE LEAGUE VOL. 2",
    text: "The next points-driven cycling and running challenge, designed for participation from anywhere.",
  },
  {
    num: "03",
    label: "TRAIL EXPERIENCE",
    title: "FUN TRAIL QUEST",
    text: "A return of the annual trail-meets-fun format with movement, tasks and community energy.",
  },
];

// Stack card preview copy (slightly different wording than hero data, matches
// the reference's events-stack-card-v3 markup exactly).
const HERO_STACK = [
  { num: "01", type: "FLAGSHIP", title: "RTG MTB", titleLine2: "CHALLENGE 2026", meta: "DELHI NCR • DATE TBA" },
  { num: "02", type: "VIRTUAL", title: "ENDURANCE", titleLine2: "LEAGUE VOL. 2", meta: "PAN-INDIA • TARGET JAN 2027" },
  { num: "03", type: "TRAIL", title: "FUN TRAIL", titleLine2: "QUEST", meta: "TARGET FEB 2027" },
];

// ---- Full 7-item event board data — exact copy from eventData ----
const EVENT_DATA = [
  {
    number: "01",
    tone: "sunset",
    kind: "FLAGSHIP",
    status: "COMING SOON",
    title: "RTG MTB CHALLENGE 2026",
    description: "A Delhi NCR mountain-bike race concept built around endurance, handling, challenge and the wider RTG community.",
    meta: ["DELHI NCR", "30–50 KM CONCEPT", "DATE TBA"],
    filterKind: "flagship",
  },
  {
    number: "02",
    tone: "electric",
    kind: "VIRTUAL",
    status: "TARGET • JAN 2027",
    title: "ENDURANCE LEAGUE VOL. 2",
    description: "The next edition of RTG's points-driven cycling and running challenge, designed for participation from anywhere.",
    meta: ["PAN-INDIA", "CYCLING + RUNNING", "TARGET JAN 2027"],
    filterKind: "virtual",
    board: { eyebrow: "PAN-INDIA • VIRTUAL", status: "TARGET • JAN 2027" },
  },
  {
    number: "03",
    tone: "trail",
    kind: "TRAIL",
    status: "TARGET • FEB 2027",
    title: "FUN TRAIL QUEST",
    description: "A return of the annual trail-meets-fun experience with movement, tasks and a community-first format.",
    meta: ["TRAIL EXPERIENCE", "MOVEMENT + TASKS", "TARGET FEB 2027"],
    filterKind: "flagship",
    board: { eyebrow: "TRAIL EXPERIENCE", status: "TARGET • FEB 2027" },
  },
  {
    number: "04",
    tone: "blue",
    kind: "COMMUNITY",
    status: "SATURDAYS",
    title: "RIDGE REPEATS",
    description: "Five loops, one rider and one simple idea: improve against your own previous loop.",
    meta: ["DELHI NCR", "5 × 9.15 KM LOOPS", "SATURDAYS"],
    filterKind: "community",
    board: { eyebrow: "WEEKLY TRAINING", status: "SATURDAYS" },
  },
  {
    number: "05",
    tone: "warm",
    kind: "COMMUNITY",
    status: "FRIDAYS",
    title: "BRICK & BURN",
    description: "A combined cycling and running session with mobility work to build multi-sport consistency.",
    meta: ["DELHI NCR", "RIDE + RUN + MOBILITY", "FRIDAYS"],
    filterKind: "community",
    board: { eyebrow: "WEEKLY TRAINING", status: "FRIDAYS" },
  },
  {
    number: "06",
    tone: "mint",
    kind: "COMMUNITY",
    status: "ANNOUNCED WEEKLY",
    title: "LONG RIDES + ESCAPES",
    description: "Long rides, MTB mornings and trail experiences that change with the weekend and location.",
    meta: ["WEEKEND", "RIDE + MTB + TRAIL", "ANNOUNCED WEEKLY"],
    filterKind: "community",
    board: { eyebrow: "COMMUNITY", status: "ANNOUNCED WEEKLY" },
  },
  {
    number: "07",
    tone: "future",
    kind: "FUTURE FORMAT",
    status: "IN DEVELOPMENT",
    title: "MORE RTG RACES",
    description: "Road, duathlon and other formats can enter the calendar once the concept, owner and execution plan are ready.",
    meta: ["FUTURE FORMAT", "ROAD + DUATHLON", "IN DEVELOPMENT"],
    filterKind: "flagship",
    board: { eyebrow: "FUTURE FORMAT", status: "IN DEVELOPMENT" },
  },
];

// Rail card short labels (events-rail-card-v3 markup — slightly different
// condensed copy than the main board cards).
const RAIL_LABELS = [
  { title: "MTB Challenge 2026", meta: "Flagship • Delhi NCR" },
  { title: "Endurance League Vol. 2", meta: "Virtual • Pan-India" },
  { title: "Fun Trail Quest", meta: "Trail • Target Feb 2027" },
  { title: "Ridge Repeats", meta: "Community • Saturdays" },
  { title: "Brick & Burn", meta: "Community • Fridays" },
  { title: "Long Rides + Escapes", meta: "Community • Weekends" },
  { title: "More RTG Races", meta: "Future Format" },
];

const FILTERS = [
  { key: "all", label: "ALL", count: 7 },
  { key: "flagship", label: "FLAGSHIP", count: 3 },
  { key: "community", label: "COMMUNITY", count: 3 },
  { key: "virtual", label: "VIRTUAL", count: 1 },
];

// Exact hex tones from the reference — spotlight (3-stop) and rail/board
// (2-stop) are each kept exactly as specified, including their minor
// per-tone inconsistencies (e.g. "blue"/"warm" differ slightly between the
// spotlight and rail/card definitions in the reference itself).
const SPOTLIGHT_TONES = {
  sunset: ["#ff6b57", "#ff4fa3", "#ffc83d"],
  electric: ["#23c8ff", "#4668ff", "#865cff"],
  trail: ["#9be34a", "#2bd8a4", "#23c8ff"],
  blue: ["#23c8ff", "#4668ff", "#7b5cff"],
  warm: ["#ff6257", "#ff9a38", "#ffc83d"],
  mint: ["#2bd8a4", "#20b9d4", "#5968ff"],
  future: ["#865cff", "#ff4fa3", "#23c8ff"],
};
const CARD_TONES = {
  sunset: ["#ff6b57", "#ff4fa3"],
  electric: ["#23c8ff", "#4668ff"],
  trail: ["#9be34a", "#2bd8a4"],
  blue: ["#23c8ff", "#5968ff"],
  warm: ["#ff6257", "#ffc83d"],
  mint: ["#2bd8a4", "#20b9d4"],
  future: ["#865cff", "#ff4fa3"],
};

const HERO_ADVANCE_MS = 4600;

// ----------------------------------------------------------------------------
// HERO — "Event Pulse" card stack + auto-advancing carousel, orbit motion
// accents (reuses the site's existing rtg-orbit-spin keyframes).
// ----------------------------------------------------------------------------
function EventsHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (i) => setIndex(((i % HERO_DATA.length) + HERO_DATA.length) % HERO_DATA.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % HERO_DATA.length), HERO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const current = HERO_DATA[index];

  return (
    <section className="relative isolate overflow-hidden bg-rtg-canvas pt-32 pb-20 md:pt-40 md:pb-28 px-6 md:px-10">
      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_1fr] gap-14 lg:gap-10 items-center">
        {/* LEFT — eyebrow / gradient title / copy / signal tags */}
        <Reveal direction="right">
          <div className="flex items-center gap-2 mb-5 text-[11px] font-bold tracking-[0.1em]">
            <span className="text-rtg-mist">EVENTS</span>
            <b className="text-rtg-purple-600">2026—27</b>
          </div>

          <span className="block text-[11px] font-bold tracking-[0.2em] uppercase text-rtg-orange-500 mb-4">
            SHOW UP FOR SOMETHING BIGGER
          </span>

          <h1 className="uppercase max-w-[720px]">
            <span
              className="block font-sans font-black leading-[0.94] tracking-[-0.052em] text-[clamp(50px,4.75vw,78px)]"
              style={{ color: "#27348b" }}
            >
              DON'T JUST
            </span>
            <span
              className="block font-sans font-black leading-[0.90] tracking-[-0.062em] text-[clamp(58px,5.7vw,92px)] mt-2 bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#25c3ff 0%,#4f7dff 22%,#7d5cff 48%,#c75dff 72%,#ff5f95 100%)" }}
            >
              MARK THE DATE.
            </span>
            <span
              className="block font-sans font-black leading-[0.91] tracking-[-0.058em] text-[clamp(55px,5.45vw,88px)] mt-3 bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#ff8a38 0%,#ff5f57 22%,#ff4fa3 45%,#a85cff 68%,#35cfff 100%)" }}
            >
              FEEL THE EVENT.
            </span>
          </h1>

          <p className="max-w-[610px] mt-7 text-rtg-mist text-[15px] font-medium leading-[1.68]">
            Races, virtual challenges, trails and community formats — built for
            movement, energy and the moments people remember after the finish.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-7">
            {["FLAGSHIP RACES", "PAN-INDIA CHALLENGES", "COMMUNITY EXPERIENCES"].map((s) => (
              <span key={s} className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-rtg-purple-600">
                <i className="w-1.5 h-1.5 rounded-full bg-rtg-orange-500 inline-block" />
                {s}
              </span>
            ))}
          </div>
        </Reveal>

        {/* RIGHT — Event Pulse stage */}
        <Reveal direction="left" delay={0.1}>
          <div
            className="relative rounded-[28px] border border-rtg-border bg-white/70 backdrop-blur-xl p-5 md:p-7 shadow-[0_30px_70px_rgba(53,36,111,0.12)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex items-center justify-between mb-5 text-[11px] font-bold tracking-[0.18em]">
              <span className="text-rtg-mist">EVENT PULSE</span>
              <b className="text-rtg-purple-600 font-display text-sm tracking-normal">
                {String(index + 1).padStart(2, "0")} / 03
              </b>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {HERO_STACK.map((card, i) => (
                <button
                  key={card.num}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`relative text-left rounded-2xl p-3.5 border transition-all ${
                    i === index
                      ? "border-transparent shadow-[0_18px_34px_rgba(53,36,111,0.14)] scale-[1.02]"
                      : "border-rtg-border bg-white/60 hover:bg-white"
                  }`}
                  style={i === index ? { background: "linear-gradient(145deg,rgba(255,255,255,.95),rgba(255,255,255,.75))" } : undefined}
                >
                  <span className={`block text-lg font-display ${i === index ? "text-rtg-purple-600" : "text-rtg-mist/50"}`}>{card.num}</span>
                  <span className={`block text-[9px] font-bold tracking-widest mt-0.5 ${i === index ? "text-rtg-orange-500" : "text-rtg-mist/60"}`}>
                    {card.type}
                  </span>
                  <strong className="block text-[12px] leading-tight font-bold text-rtg-purple-700 mt-2">
                    {card.title}
                    <br />
                    {card.titleLine2}
                  </strong>
                  {i === index && (
                    <motion.span
                      layoutId="hero-stack-arrow"
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-rtg-orange-500 text-white flex items-center justify-center"
                    >
                      <ArrowUpRight size={12} />
                    </motion.span>
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="relative rounded-2xl bg-white border border-rtg-border p-4 flex items-center gap-4 overflow-hidden"
              >
                {/* Orbit motion accent */}
                <div className="hidden sm:block absolute -right-6 -top-6 w-24 h-24 pointer-events-none opacity-70">
                  <div className="absolute inset-0 rounded-full border border-rtg-purple-300/30" style={{ animation: "rtg-orbit-spin 19s linear infinite" }} />
                  <div className="absolute inset-3 rounded-full border border-rtg-orange-400/30" style={{ animation: "rtg-orbit-spin-reverse 15s linear infinite" }} />
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rtg-purple-600 to-rtg-purple-400 text-white flex items-center justify-center font-display text-base shrink-0 relative z-10">
                  {current.num}
                </div>
                <div className="min-w-0 relative z-10">
                  <span className="block text-[9px] font-bold tracking-widest text-rtg-orange-500 mb-0.5">{current.label}</span>
                  <strong className="block text-[15px] font-bold text-rtg-purple-700 leading-tight">{current.title}</strong>
                  <p className="text-[12px] text-rtg-mist mt-1 leading-snug">{current.text}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous event"
                className="w-9 h-9 rounded-full border border-rtg-border flex items-center justify-center text-rtg-purple-600 hover:bg-rtg-purple-950/5 transition-colors shrink-0"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="flex-1 h-[3px] rounded-full bg-rtg-border overflow-hidden">
                <motion.span
                  key={index}
                  className="block h-full rounded-full bg-gradient-to-r from-rtg-orange-500 via-rtg-purple-400 to-rtg-purple-600"
                  initial={{ width: "0%" }}
                  animate={{ width: paused ? undefined : "100%" }}
                  transition={{ duration: HERO_ADVANCE_MS / 1000, ease: "linear" }}
                />
              </div>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next event"
                className="w-9 h-9 rounded-full border border-rtg-border flex items-center justify-center text-rtg-purple-600 hover:bg-rtg-purple-950/5 transition-colors shrink-0"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// MAIN PAGE — "Find Your Next Start Line" (filter + spotlight + rail) and
// "Browse the Board" (full grid).
// ----------------------------------------------------------------------------
export default function Events() {
  const [filterKind, setFilterKind] = useState("all");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightRef = useRef(null);

  const visible = (i) => filterKind === "all" || EVENT_DATA[i].filterKind === filterKind;

  const selectSpotlight = (i, { scroll = false } = {}) => {
    setSpotlightIndex(i);
    if (scroll) {
      spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleFilter = (key) => {
    setFilterKind(key);
    const firstVisible = EVENT_DATA.findIndex((e, i) => key === "all" || e.filterKind === key);
    if (firstVisible >= 0) setSpotlightIndex(firstVisible);
  };

  const spotlight = EVENT_DATA[spotlightIndex];
  const spotlightColors = SPOTLIGHT_TONES[spotlight.tone] || SPOTLIGHT_TONES.sunset;

  return (
    <>
      <EventsHero />

      <section className="relative isolate overflow-hidden bg-rtg-canvas py-16 md:py-20 px-6 md:px-10" ref={spotlightRef}>
        <div className="relative max-w-7xl mx-auto">
          {/* Editorial head */}
          <Reveal className="flex items-end gap-5 pb-6 mb-10 border-b border-rtg-border">
            <div className="shrink-0">
              <span className="block font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-[0.8] text-rtg-purple-600/20">01</span>
              <small className="block text-[10px] font-bold tracking-widest text-rtg-mist mt-1">DISCOVER</small>
            </div>
            <div>
              <span className="block text-[11px] font-bold tracking-[0.2em] uppercase text-rtg-orange-500 mb-2">WHAT'S NEXT</span>
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95]">
                FIND YOUR <span className="text-gradient">NEXT START LINE.</span>
              </h2>
              <p className="text-rtg-mist text-base max-w-xl mt-3">
                Choose the kind of energy you want next. Flagship race, virtual
                challenge or a regular community format — every card below can
                become a full event experience when registration goes live.
              </p>
            </div>
          </Reveal>

          {/* Filter pills */}
          <Reveal className="flex flex-wrap items-center gap-2 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilter(f.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                  filterKind === f.key ? "bg-rtg-purple-600 text-white" : "glass text-rtg-mist hover:text-rtg-purple-600"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] ${
                    filterKind === f.key ? "bg-white/20" : "bg-rtg-purple-950/8"
                  }`}
                >
                  {String(f.count).padStart(2, "0")}
                </span>
              </button>
            ))}
          </Reveal>

          {/* Spotlight + rail */}
          <Reveal className="grid lg:grid-cols-[1fr_360px] gap-6 mb-16">
            <AnimatePresence mode="wait">
              <motion.article
                key={spotlightIndex}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-[28px] border border-rtg-border p-8 md:p-10 min-h-[320px] flex flex-col justify-center"
                style={{
                  background: `radial-gradient(circle at 92% 7%, ${spotlightColors[0]}14, transparent 25%), radial-gradient(circle at 6% 94%, ${spotlightColors[2]}10, transparent 30%), #ffffff`,
                }}
              >
                {/* Orbit motion accent */}
                <div aria-hidden="true" className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 pointer-events-none opacity-60">
                  <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${spotlightColors[0]}30`, animation: "rtg-orbit-spin 19s linear infinite" }} />
                  <div className="absolute inset-6 rounded-full border" style={{ borderColor: `${spotlightColors[1]}30`, animation: "rtg-orbit-spin-reverse 15s linear infinite" }} />
                  <span className="rtg-pulse-dot absolute left-0 top-0 w-2 h-2 rounded-full" style={{ background: spotlightColors[0] }} />
                  <span className="rtg-pulse-dot absolute right-2 bottom-4 w-1.5 h-1.5 rounded-full" style={{ background: spotlightColors[2], animationDelay: "1s" }} />
                </div>

                <div className="relative flex items-start gap-5">
                  <div className="shrink-0">
                    <span className="block font-display text-5xl leading-none" style={{ color: spotlightColors[0] }}>
                      {spotlight.number}
                    </span>
                    <small className="block text-[10px] font-bold tracking-widest text-rtg-mist mt-1">{spotlight.kind}</small>
                  </div>
                  <div className="min-w-0">
                    <span
                      className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full text-white mb-3"
                      style={{ background: `linear-gradient(90deg, ${spotlightColors[0]}, ${spotlightColors[1]})` }}
                    >
                      {spotlight.status}
                    </span>
                    <h3 className="font-display text-3xl md:text-5xl text-rtg-purple-700 leading-[0.95]">{spotlight.title}</h3>
                    <p className="text-rtg-mist text-sm md:text-base max-w-lg mt-3 leading-relaxed">{spotlight.description}</p>
                    <div className="flex flex-wrap gap-2 mt-5">
                      {spotlight.meta.map((m) => (
                        <span key={m} className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-rtg-purple-950/5 text-rtg-purple-600">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Rail */}
            <div className="flex flex-col gap-2.5">
              {EVENT_DATA.map((e, i) => {
                if (!visible(i)) return null;
                const [a, b] = CARD_TONES[e.tone] || CARD_TONES.sunset;
                const active = i === spotlightIndex;
                const label = RAIL_LABELS[i];
                return (
                  <button
                    key={e.number}
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
                      <b className="block text-sm text-rtg-purple-700 truncate">{label.title}</b>
                      <small className="block text-xs text-rtg-mist truncate">{label.meta}</small>
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
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 mb-8 border-b" style={{ borderColor: "rgba(70,104,255,.10)" }}>
            <span
              className="font-display text-2xl md:text-3xl bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#23c8ff,#5968ff,#ff4fa3)" }}
            >
              BROWSE THE BOARD
            </span>
            <p className="text-rtg-mist text-sm">Hover for a quick preview. Click a card to bring it into the spotlight.</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EVENT_DATA.filter((_, i) => i !== 0 && visible(i)).map((e) => {
              const i = EVENT_DATA.indexOf(e);
              const [a, b] = CARD_TONES[e.tone] || CARD_TONES.sunset;
              return (
                <motion.article
                  key={e.number}
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
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: a }}>
                      {e.board?.eyebrow || e.kind}
                    </span>
                    <b className="font-display text-2xl text-rtg-purple-950/15">{e.number}</b>
                  </div>
                  <h3 className="font-display text-2xl text-rtg-purple-700 leading-tight mb-2">{e.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed mb-6">{e.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wide text-rtg-mist">{e.board?.status || e.status}</span>
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
        </div>
      </section>
    </>
  );
}
