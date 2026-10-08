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
// Each event's own page is /events/<its URL slug>.
// Layout, type and colour are in index.css under "EVENTS PAGE" (.rtg-ev-*).
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
const joinParts = (...parts) => parts.filter(Boolean).join(" • ");
// Inline style that colours an element in an event's accent colours.
const tint = ([a, b, c]) => ({ "--ev-a": a, "--ev-b": b, "--ev-c": c });

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
    <section className="rtg-ev-hero">
      <div className={`rtg-ev-hero-wrap ${count ? "" : "is-solo"}`}>
        {/* LEFT — small labels / three-line title / copy / signal tags */}
        <Reveal direction="right">
          <div className="rtg-ev-index">
            <span>{copy.indexLabel}</span>
            <b>{copy.indexYear}</b>
          </div>

          <span className="rtg-ev-eyebrow">{copy.eyebrow}</span>

          <h1 className="rtg-ev-title">
            <span className="is-solid">{copy.titleLine1}</span>
            <span className="is-cool">{copy.titleLine2}</span>
            <span className="is-warm">{copy.titleLine3}</span>
          </h1>

          <p className="rtg-ev-hero-text">{copy.intro}</p>

          <div className="rtg-ev-signals">
            {signals.map((s) => (
              <span key={s}>
                <i />
                {s}
              </span>
            ))}
          </div>
        </Reveal>

        {/* RIGHT — Event Pulse stage */}
        {count > 0 && (
          <Reveal direction="left" delay={0.1}>
            <div className="rtg-ev-stage" data-word={copy.indexLabel} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div className="rtg-ev-stage-top">
                <span>{copy.pulseLabel}</span>
                <b>
                  {pad2(index + 1)} / {pad2(count)}
                </b>
              </div>

              <div className="rtg-ev-stack">
                {items.map((card, i) => {
                  const [line1, line2] = splitTitle(card.title, card.accent);
                  return (
                    <button key={card.id} type="button" onClick={() => goTo(i)} className={`rtg-ev-stack-card ${i === index ? "is-active" : ""}`} style={tint(card.colors)}>
                      <span className="rtg-ev-stack-num">{card.number}</span>
                      <span className="rtg-ev-stack-type">{card.kind}</span>
                      <div>
                        <strong>
                          {line1}
                          {line2 && (
                            <>
                              <br />
                              {line2}
                            </>
                          )}
                        </strong>
                        {card.status && <small>{card.status}</small>}
                      </div>
                      <i aria-hidden="true">→</i>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  className="rtg-ev-selected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="rtg-ev-orb">{current.number}</div>
                  <div className="rtg-ev-selected-copy">
                    <span>{joinParts(current.eyebrow, current.status)}</span>
                    <strong>{current.title}</strong>
                    {current.description && <p className="line-clamp-3">{current.description}</p>}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="rtg-ev-controls">
                <button type="button" onClick={() => goTo(index - 1)} aria-label={copy.prevLabel}>
                  <ArrowLeft size={15} />
                </button>
                <div className="rtg-ev-progress">
                  <motion.span
                    key={index}
                    initial={{ width: "0%" }}
                    animate={{ width: paused ? undefined : "100%" }}
                    transition={{ duration: HERO_ADVANCE_MS / 1000, ease: "linear" }}
                  />
                </div>
                <button type="button" onClick={() => goTo(index + 1)} aria-label={copy.nextLabel}>
                  <ArrowRight size={15} />
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

  // One filter per category that actually has events, in first-seen order,
  // coloured like the first event in it.
  const filters = useMemo(() => {
    const kinds = new Map();
    items.forEach((e) => {
      const kind = kinds.get(e.kind) || { key: e.kind, label: e.kind, count: 0, colors: e.colors };
      kind.count += 1;
      kinds.set(e.kind, kind);
    });
    return [{ key: ALL, label: copy.allLabel, count: items.length }, ...kinds.values()];
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
    <div className="rtg-ev">
      <EventsHero copy={copy} items={items.slice(0, HERO_EVENT_COUNT)} />

      <section className="rtg-ev-section">
        <div className="rtg-ev-inner">
          {/* Editorial head */}
          <Reveal className="rtg-ev-head">
            <div className="rtg-ev-head-number">
              <span>{copy.sectionNumber}</span>
              <small>{copy.sectionLabel}</small>
            </div>
            <div>
              <span className="rtg-ev-kicker">{copy.kicker}</span>
              <h2>
                {copy.heading}
                <span>{copy.headingAccent}</span>
              </h2>
              <p>{copy.body}</p>
            </div>
          </Reveal>

          {!spotlight ? (
            <p className="rtg-ev-empty">{copy.emptyText}</p>
          ) : (
            <>
              {/* Filter pills */}
              <Reveal>
                <div className="rtg-ev-filter">
                  {filters.map((f) => {
                    const classes = [f.key === ALL && "is-all", filterKind === f.key && "is-active"];
                    return (
                      <button
                        key={f.key}
                        type="button"
                        className={classes.filter(Boolean).join(" ")}
                        style={f.colors ? tint(f.colors) : undefined}
                        aria-pressed={filterKind === f.key}
                        onClick={() => handleFilter(f.key)}
                      >
                        {f.label}
                        <span>{pad2(f.count)}</span>
                      </button>
                    );
                  })}
                </div>
              </Reveal>

              {/* Spotlight + rail */}
              <Reveal>
                <div className="rtg-ev-spotlight" ref={spotlightRef}>
                  <AnimatePresence mode="wait">
                    <motion.article
                      key={spotlight.id}
                      className="rtg-ev-spot"
                      style={tint(spotlight.colors)}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="rtg-ev-spot-motion" aria-hidden="true">
                        <span className="rtg-ev-ring is-a" />
                        <span className="rtg-ev-ring is-b" />
                        <span className="rtg-ev-node is-a" />
                        <span className="rtg-ev-node is-b" />
                      </div>

                      <div className="rtg-ev-spot-index">
                        <span>{spotlight.number}</span>
                        <small>{spotlight.kind}</small>
                      </div>

                      <div className="rtg-ev-spot-content">
                        {spotlight.status && <span className="rtg-ev-spot-status">{spotlight.status}</span>}
                        <h3>{spotlight.title}</h3>
                        {spotlight.description && <p>{spotlight.description}</p>}
                        {spotlight.meta.length > 0 && (
                          <div className="rtg-ev-spot-meta">
                            {spotlight.meta.map((m) => (
                              <span key={m}>{m}</span>
                            ))}
                          </div>
                        )}
                        <Link to={spotlight.path} className="rtg-ev-spot-link">
                          {copy.viewLabel}
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </motion.article>
                  </AnimatePresence>

                  {/* Rail */}
                  <div className="rtg-ev-rail">
                    {items.map((e, i) => {
                      if (!visible(e)) return null;
                      return (
                        <button key={e.id} type="button" className={`rtg-ev-rail-card ${i === spotlightIndex ? "is-active" : ""}`} style={tint(e.colors)} onClick={() => selectSpotlight(i)}>
                          <span>{e.number}</span>
                          <div>
                            <b>{e.title}</b>
                            <small>{joinParts(e.kind, e.status)}</small>
                          </div>
                          <i aria-hidden="true">→</i>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Reveal>

              {/* Browse the board */}
              <Reveal className="rtg-ev-browse">
                <span>{copy.boardHeading}</span>
                <p>{copy.boardHint}</p>
              </Reveal>

              <div className="rtg-ev-grid">
                {items.map((e, i) => {
                  // The first event is already the default spotlight above.
                  if (i === 0 || !visible(e)) return null;
                  const open = () => selectSpotlight(i, { scroll: true });
                  return (
                    <article
                      key={e.id}
                      className="rtg-ev-card"
                      style={tint(e.colors)}
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          open();
                        }
                      }}
                    >
                      <div className="rtg-ev-card-top">
                        <span>{e.eyebrow}</span>
                        <b>{e.number}</b>
                      </div>
                      <h3>{e.title}</h3>
                      <p className="line-clamp-4">{e.description}</p>
                      <div className="rtg-ev-card-bottom">
                        <span>{e.status}</span>
                        <i aria-hidden="true">→</i>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
