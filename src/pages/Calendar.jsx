import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarPlus, X } from "lucide-react";
import Reveal from "../components/ui/Reveal";
import SmartLink from "../components/ui/SmartLink";
import { useCalendarActivities, useCalendarCategories, useSiteSettings, buildCalendarPageCopy } from "../lib/publicData";
import { downloadIcsFile } from "../lib/ics";

// ============================================================================
// CALENDAR PAGE — a hero with a live "calendar board", the Weekly Rhythm
// panel, and a month grid whose activities open in a detail window.
//
// Nothing here is written in code:
//   calendar_activities  (Admin -> Calendar — Activities)      what's on it
//   calendar_categories  (Admin -> Calendar — Activity Types)  the filters,
//                                                              tags, colours
//   "text.calendar.<field>" (Admin -> Site Content -> Calendar) every heading,
//                                                              label, paragraph
// An activity is "weekly" (on its weekday, every week), "once" (on one date)
// or "flexible" (no fixed day — Weekly Rhythm panel only).
// Layout and motion are in index.css under "CALENDAR PAGE" (.rtg-cal-*).
// ============================================================================

// Monday-first, matching calendar_activities.weekday.
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BOARD_DAYS = 28; // the hero board shows four weeks, starting this week
const BOARD_UPCOMING = 3;
const HERO_TAGS = 3;
const ALL = "all";
const EASE = [0.22, 1, 0.36, 1];

const pad2 = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// "2026-10-09" as a local date (new Date("2026-10-09") would be UTC midnight).
const fromIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekdayIndex = (d) => (d.getDay() + 6) % 7;
const mondayOf = (d) => addDays(d, -weekdayIndex(d));
const format = (d, options) => d.toLocaleDateString("en-GB", options);
const longDate = (d) => `${format(d, { weekday: "long" })} • ${format(d, { day: "2-digit", month: "long", year: "numeric" })}`;
const monthTitle = (d) => format(d, { month: "long", year: "numeric" });
const splitList = (text) => (text || "").split(",").map((s) => s.trim()).filter(Boolean);
const joinParts = (...parts) => parts.filter(Boolean).join(" • ");

// The activities that fall on one day.
const activitiesOn = (activities, day) => {
  const weekday = WEEKDAYS[weekdayIndex(day)];
  const iso = toIso(day);
  return activities.filter((a) => (a.schedule === "weekly" ? a.weekday === weekday : a.schedule === "once" && a.date === iso));
};

// The day an activity next happens, from `from` onwards (null if it has no day).
const nextDateOf = (activity, from) => {
  if (activity.schedule === "once") return activity.date ? fromIso(activity.date) : null;
  if (activity.schedule !== "weekly") return null;
  const target = WEEKDAYS.indexOf(activity.weekday);
  return target < 0 ? null : addDays(from, (target - weekdayIndex(from) + 7) % 7);
};

// "5:00 AM" -> [5, 0]; [null, null] when the text has no clock time.
function parseTime(text) {
  const match = (text || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return [null, null];
  let hours = parseInt(match[1], 10);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return [hours, parseInt(match[2], 10)];
}

function saveToCalendar(activity, date) {
  const [hours, minutes] = parseTime(activity.time);
  const details = {
    title: activity.title,
    description: joinParts(activity.format, activity.summary),
    location: [activity.location, activity.city].filter(Boolean).join(", "),
  };
  if (hours == null) {
    downloadIcsFile({ ...details, allDayDate: date });
    return;
  }
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  downloadIcsFile({ ...details, start, end });
}

// ----------------------------------------------------------------------------
// BACKDROP — sports line-art fixed to the viewport while the page scrolls
// over it: drifting bike (wheels turning), runner, shoe, stopwatch (hand
// sweeping) and flag, two dashed routes with a dot travelling along each.
// ----------------------------------------------------------------------------
function CalendarBackdrop() {
  return (
    <div className="rtg-cal-bg" aria-hidden="true">
      <svg className="rtg-cal-bg-bike" viewBox="0 0 240 150">
        <g className="rtg-cal-spin">
          <circle cx="52" cy="104" r="32" />
          <path d="M52 72v64M20 104h64" />
        </g>
        <g className="rtg-cal-spin">
          <circle cx="187" cy="104" r="32" />
          <path d="M187 72v64M155 104h64" />
        </g>
        <path d="M52 104 93 46h34l60 58M93 46l31 58M82 72h76M110 28h39" />
        <path d="M124 104 143 70" />
      </svg>

      <svg className="rtg-cal-bg-runner" viewBox="0 0 150 150">
        <circle cx="92" cy="22" r="9" />
        <path d="M83 37 65 55l13 20 19-13 12 17" />
        <path d="M66 55 44 61 26 51" />
        <path d="M78 75 58 99 34 120" />
        <path d="M80 76 99 99l25 10" />
        <path d="M99 99 121 128" />
        <path d="M58 99 50 131" />
      </svg>

      <svg className="rtg-cal-bg-shoe" viewBox="0 0 180 95">
        <path d="M17 58c22 3 37 1 52-10l19-14 18 15c11 9 22 14 39 17l18 4c7 2 10 8 8 14-2 5-6 7-13 7H42c-18 0-28-7-25-33Z" />
        <path d="M72 47 84 57M84 39 96 50M98 43l13 12" />
        <path d="M31 72h120" />
      </svg>

      <svg className="rtg-cal-bg-watch" viewBox="0 0 140 140">
        <circle cx="70" cy="78" r="39" />
        <path d="M70 39V23M55 19h30M96 47l10-10" />
        <path className="rtg-cal-sweep" d="M70 78 88 63" />
        <circle cx="70" cy="78" r="4" />
      </svg>

      <svg className="rtg-cal-bg-flag" viewBox="0 0 120 150">
        <path d="M33 127V21" />
        <path className="rtg-cal-wave" d="M34 26c27-13 36 11 61-2v45c-23 13-36-10-61 3" />
        <path d="M22 128h23" />
      </svg>

      <svg className="rtg-cal-bg-routes" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path id="rtg-cal-route-a" className="rtg-cal-route-a" d="M-40 170C150 80 260 260 430 165C590 72 720 265 885 158C1034 61 1170 193 1480 72" />
        <path id="rtg-cal-route-b" className="rtg-cal-route-b" d="M-80 738C120 622 255 798 450 687C632 584 790 755 970 650C1126 558 1250 664 1480 560" />
        <circle className="rtg-cal-rider rtg-cal-rider-a" r="4">
          <animateMotion dur="19s" repeatCount="indefinite">
            <mpath href="#rtg-cal-route-a" />
          </animateMotion>
        </circle>
        <circle className="rtg-cal-rider rtg-cal-rider-b" r="4">
          <animateMotion dur="24s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
            <mpath href="#rtg-cal-route-b" />
          </animateMotion>
        </circle>
      </svg>

      <span className="rtg-cal-pulse" style={{ left: "13%", top: "36%", background: "#f76b1c" }} />
      <span className="rtg-cal-pulse" style={{ right: "11%", top: "43%", background: "#b981d8", animationDelay: "1.15s" }} />
      <span className="rtg-cal-pulse" style={{ left: "43%", bottom: "10%", background: "#58bec8", animationDelay: "2.15s" }} />
      <span className="rtg-cal-glow" style={{ width: 310, height: 310, left: "9%", top: "13%", background: "#f76b1c" }} />
      <span className="rtg-cal-glow" style={{ width: 350, height: 350, right: "8%", bottom: "9%", background: "#b981d8", animationDelay: "3s" }} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// HERO — headline on the left; on the right a tilted board showing the next
// four weeks (days with something on are tinted in that activity type's
// colour) and the next few activities coming up.
// ----------------------------------------------------------------------------
function CalendarHero({ copy, today, activities, categories, tint }) {
  const days = useMemo(() => {
    const start = mondayOf(today);
    return Array.from({ length: BOARD_DAYS }, (_, i) => addDays(start, i));
  }, [today]);

  const upcoming = useMemo(() => {
    const list = [];
    for (let i = 0; i < BOARD_DAYS && list.length < BOARD_UPCOMING; i++) {
      const day = addDays(today, i);
      activitiesOn(activities, day).forEach((activity) => {
        if (list.length < BOARD_UPCOMING) list.push({ activity, day });
      });
    }
    return list;
  }, [activities, today]);

  const tags = splitList(copy.heroTags);
  const todayIso = toIso(today);
  const miniCards = [
    { label: copy.cardOneLabel, text: copy.cardOneText },
    { label: copy.cardTwoLabel, text: copy.cardTwoText },
  ];

  return (
    <section className="rtg-cal-hero">
      <div className="rtg-cal-hero-grid">
        <Reveal direction="right">
          <span className="rtg-cal-kicker">{copy.heroKicker}</span>
          <h1 className="font-display">
            <span>{copy.heroTitle}</span>
            <span className="text-gradient">{copy.heroTitleAccent}</span>
          </h1>
          <p className="rtg-cal-hero-text">{copy.heroText}</p>
          <div className="rtg-cal-dots">
            {tags.map((tag, i) => (
              <span key={tag} className="contents">
                {i > 0 && <i />}
                <span>{tag}</span>
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="rtg-cal-scene" aria-hidden="true">
            <div className="rtg-cal-ring rtg-cal-ring-one" />
            <div className="rtg-cal-ring rtg-cal-ring-two" />
            <div className="rtg-cal-sheet rtg-cal-sheet-back" />
            <div className="rtg-cal-sheet rtg-cal-sheet-mid" />

            <div className="rtg-cal-board-float">
              <div className="rtg-cal-board">
                <div className="rtg-cal-board-top">
                  <div>
                    <small>{copy.boardLabel}</small>
                    <strong>{monthTitle(today)}</strong>
                  </div>
                  <span className="rtg-cal-board-badge">{copy.boardBadge}</span>
                </div>

                <div className="rtg-cal-board-week">
                  {WEEKDAYS.map((name) => (
                    <span key={name}>{name.slice(0, 3)}</span>
                  ))}
                </div>

                <div className="rtg-cal-board-days">
                  {days.map((day, i) => {
                    const iso = toIso(day);
                    const first = activitiesOn(activities, day)[0];
                    const state = iso === todayIso ? "is-today" : iso < todayIso ? "is-past" : first ? "is-busy" : "";
                    return (
                      <span key={iso} className={state} style={{ "--i": i, ...(first ? tint(first.category) : null) }}>
                        {day.getDate()}
                      </span>
                    );
                  })}
                </div>

                {upcoming.length > 0 && (
                  <div className="rtg-cal-board-next">
                    {upcoming.map(({ activity, day }) => (
                      <article key={`${activity.id}-${toIso(day)}`} className="rtg-cal-board-chip" style={tint(activity.category)}>
                        <b>{format(day, { weekday: "short" })}</b>
                        <div className="min-w-0">
                          <strong>{activity.title}</strong>
                          <span>{activity.format || joinParts(activity.location, activity.city)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {categories.slice(0, HERO_TAGS).map((category, i) => (
              <div key={category.slug} className={`rtg-cal-tag rtg-cal-tag-${i + 1}`} style={tint(category.slug)}>
                {category.name}
              </div>
            ))}

            {miniCards.map(
              (card, i) =>
                card.text && (
                  <div key={card.label + card.text} className={`rtg-cal-mini rtg-cal-mini-${i + 1}`}>
                    <span>{card.label}</span>
                    <strong>{card.text}</strong>
                  </div>
                )
            )}
          </div>
        </Reveal>
      </div>

      <a className="rtg-cal-cue" href="#calendar">
        <span>{copy.scrollLabel}</span>
        <span className="rtg-cal-cue-mouse" aria-hidden="true">
          <i />
        </span>
        <span className="rtg-cal-cue-arrow" aria-hidden="true">
          ↓
        </span>
      </a>
    </section>
  );
}

// ----------------------------------------------------------------------------
// WEEKLY RHYTHM — the activities marked "Also list in the Weekly Rhythm
// panel", each opening its detail window.
// ----------------------------------------------------------------------------
function RhythmPanel({ copy, today, activities, categories, tint, onOpen }) {
  const listed = activities.filter((a) => a.inRhythm);

  const whenOf = (activity) => {
    if (activity.schedule === "weekly") return activity.weekday;
    if (activity.schedule === "once") return activity.date ? format(fromIso(activity.date), { day: "numeric", month: "short", year: "numeric" }) : "";
    return activity.whenText;
  };

  return (
    <Reveal className="rtg-cal-glass rtg-cal-rhythm">
      <div className="rtg-cal-rhythm-head">
        <div>
          <span className="rtg-cal-kicker">{copy.rhythmKicker}</span>
          <h3 className="font-display">{copy.rhythmTitle}</h3>
        </div>
        {listed.length > 0 && <span className="rtg-cal-count">{pad2(listed.length)}</span>}
      </div>

      <p className="rtg-cal-rhythm-text">{copy.rhythmText}</p>

      {listed.length === 0 ? (
        <p className="rtg-cal-rhythm-text">{copy.rhythmEmptyText}</p>
      ) : (
        <div className="rtg-cal-rhythm-list">
          {listed.map((activity) => (
            <button
              key={activity.id}
              type="button"
              className="rtg-cal-rhythm-item"
              style={tint(activity.category)}
              onClick={() => onOpen(activity, nextDateOf(activity, today))}
            >
              <small>{joinParts(whenOf(activity), activity.city)}</small>
              <strong>{activity.title}</strong>
              <span>{joinParts(activity.location, activity.format) || activity.summary}</span>
              <i>{copy.rhythmViewLabel} →</i>
            </button>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="rtg-cal-rhythm-foot">
          {categories.map((category) => (
            <span key={category.slug} className="rtg-cal-pill" style={tint(category.slug)}>
              {category.name}
            </span>
          ))}
        </div>
      )}
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// MONTH CALENDAR — month navigation, one filter per activity type, and a
// Monday-first grid. From tablet up each day lists its activities; on a
// phone each day shows a dot per activity and the tapped day's activities
// are listed under the grid.
// ----------------------------------------------------------------------------
function MonthCalendar({ copy, today, activities, categories, tint, onOpen }) {
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth(), direction: 0 }));
  const [filter, setFilter] = useState(ALL);
  const [picked, setPicked] = useState(null);

  const { year, month, direction } = view;
  const todayIso = toIso(today);

  const step = (by) =>
    setView((v) => {
      const next = new Date(v.year, v.month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth(), direction: by };
    });
  const goToday = () =>
    setView((v) => ({
      year: today.getFullYear(),
      month: today.getMonth(),
      direction: Math.sign(today.getFullYear() * 12 + today.getMonth() - (v.year * 12 + v.month)),
    }));

  // A filter left pointing at an activity type that's since been removed
  // falls back to "all".
  const activeFilter = filter === ALL || categories.some((c) => c.slug === filter) ? filter : ALL;

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = mondayOf(first);
    const weeks = Math.ceil((weekdayIndex(first) + new Date(year, month + 1, 0).getDate()) / 7);
    const shown = activeFilter === ALL ? activities : activities.filter((a) => a.category === activeFilter);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, iso: toIso(date), inMonth: date.getMonth() === month, items: activitiesOn(shown, date) };
    });
  }, [year, month, activities, activeFilter]);

  const monthDays = days.filter((d) => d.inMonth);
  const hasAny = monthDays.some((d) => d.items.length > 0);

  // Phones: the day whose activities are listed under the grid — the one
  // tapped, else today, else the first day of the month with something on.
  const selected =
    monthDays.find((d) => d.iso === picked) || monthDays.find((d) => d.iso === todayIso) || monthDays.find((d) => d.items.length > 0) || monthDays[0];

  const filters = [{ key: ALL, label: copy.allLabel }, ...categories.map((c) => ({ key: c.slug, label: c.name, slug: c.slug }))];
  const onThisMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <Reveal amount={0.05}>
      <div className="rtg-cal-toolbar">
        <div className="rtg-cal-nav">
          <button type="button" onClick={() => step(-1)} aria-label={copy.prevLabel}>
            <ArrowLeft size={16} />
          </button>
          <div className="rtg-cal-month" aria-live="polite">
            {monthTitle(new Date(year, month, 1))}
          </div>
          <button type="button" onClick={() => step(1)} aria-label={copy.nextLabel}>
            <ArrowRight size={16} />
          </button>
          {!onThisMonth && (
            <button type="button" className="rtg-cal-today" onClick={goToday}>
              {copy.todayLabel}
            </button>
          )}
        </div>

        <div className="rtg-cal-filters">
          {filters.map((f) => {
            const active = f.key === activeFilter;
            return (
              <button key={f.key} type="button" className={active ? "is-active" : ""} style={f.slug ? tint(f.slug) : undefined} aria-pressed={active} onClick={() => setFilter(f.key)}>
                {active && <motion.span layoutId="rtg-cal-filter" className="rtg-cal-filter-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                {f.slug && <span className="rtg-cal-filter-dot" />}
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rtg-cal-glass rtg-cal-card">
        <div className="rtg-cal-weekdays">
          {WEEKDAYS.map((name) => (
            <span key={name}>{name.slice(0, 3)}</span>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={`${year}-${month}`}
            className="rtg-cal-grid"
            custom={direction}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 28 }),
              center: { opacity: 1, x: 0 },
              exit: (d) => ({ opacity: 0, x: d * -28 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: EASE }}
          >
            {days.map((day) => {
              const classes = ["rtg-cal-day", !day.inMonth && "is-other", day.iso === todayIso && "is-today", day.iso === selected?.iso && "is-selected"];
              return (
                <div key={day.iso} className={classes.filter(Boolean).join(" ")}>
                  <div className="rtg-cal-day-num">{day.date.getDate()}</div>

                  {day.inMonth && (
                    <button
                      type="button"
                      className="rtg-cal-day-tap"
                      aria-label={`${longDate(day.date)} — ${day.items.length}`}
                      aria-pressed={day.iso === selected?.iso}
                      onClick={() => setPicked(day.iso)}
                    />
                  )}

                  {day.items.length > 0 && (
                    <div className="rtg-cal-day-dots" aria-hidden="true">
                      {day.items.map((activity) => (
                        <i key={activity.id} style={tint(activity.category)} />
                      ))}
                    </div>
                  )}

                  {day.items.map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      className="rtg-cal-chip"
                      style={tint(activity.category)}
                      aria-label={`${activity.title} — ${longDate(day.date)}`}
                      onClick={() => onOpen(activity, day.date)}
                    >
                      {activity.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {!hasAny && <p className="rtg-cal-empty">{copy.emptyText}</p>}
      </div>

      {selected && (
        <div className="rtg-cal-agenda">
          <h4>{longDate(selected.date)}</h4>
          {selected.items.length === 0 ? (
            <p className="rtg-cal-empty">{copy.dayEmptyText}</p>
          ) : (
            selected.items.map((activity) => (
              <button key={activity.id} type="button" className="rtg-cal-chip" style={tint(activity.category)} onClick={() => onOpen(activity, selected.date)}>
                {activity.title}
                <small>{joinParts(activity.time, activity.location, activity.format)}</small>
              </button>
            ))
          )}
        </div>
      )}
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// ACTIVITY DETAIL WINDOW — opens over the page; closes with the × button,
// a click outside, or Escape. Only the boxes an activity has a value for
// are shown.
// ----------------------------------------------------------------------------
function ActivityModal({ detail, copy, categoryOf, tint, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!detail) return undefined;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [detail, onClose]);

  const activity = detail?.activity;
  const date = detail?.date;
  const category = activity ? categoryOf(activity.category) : null;
  const info = activity
    ? [
        { label: copy.formatLabel, value: activity.format },
        { label: copy.locationLabel, value: joinParts(activity.location, activity.city) },
        { label: copy.timeLabel, value: activity.time },
        { label: copy.organiserLabel, value: activity.organiser },
        { label: copy.statusLabel, value: activity.status },
      ].filter((row) => row.value)
    : [];
  const when = date ? longDate(date) : activity?.whenText;

  return createPortal(
    <AnimatePresence>
      {activity && (
        <motion.div className="rtg-cal-modal" style={tint(activity.category)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <div className="rtg-cal-modal-backdrop" onClick={onClose} />

          <motion.div
            className="rtg-cal-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rtg-cal-modal-title"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button ref={closeRef} type="button" className="rtg-cal-modal-close" aria-label={copy.closeLabel} onClick={onClose}>
              <X size={18} />
            </button>

            <div className="rtg-cal-modal-accent">
              {category && <span>{category.detailLabel}</span>}
              {when && <strong>{when}</strong>}
            </div>

            <div className="rtg-cal-modal-body">
              <span className="rtg-cal-kicker">{copy.modalKicker}</span>
              <h3 className="font-display" id="rtg-cal-modal-title">
                {activity.title}
              </h3>
              {activity.summary && <p className="rtg-cal-modal-summary">{activity.summary}</p>}

              {info.length > 0 && (
                <div className="rtg-cal-modal-info">
                  {info.map((row) => (
                    <div key={row.label}>
                      <small>{row.label}</small>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {activity.note && (
                <div className="rtg-cal-modal-note">
                  <span>{copy.noteLabel}</span>
                  <p>{activity.note}</p>
                </div>
              )}

              {(activity.link || date) && (
                <div className="rtg-cal-modal-actions">
                  {activity.link && (
                    <SmartLink to={activity.link} className="rtg-cal-btn is-primary">
                      {activity.linkLabel || copy.linkLabel}
                      <ArrowUpRight size={14} />
                    </SmartLink>
                  )}
                  {date && (
                    <button type="button" className="rtg-cal-btn" onClick={() => saveToCalendar(activity, date)}>
                      <CalendarPlus size={14} />
                      {copy.addLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function Calendar() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildCalendarPageCopy(settings), [settings]);
  const categories = useCalendarCategories();
  const activities = useCalendarActivities();
  const [detail, setDetail] = useState(null); // { activity, date } while the detail window is open

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const categoryOf = useCallback((slug) => categories.find((c) => c.slug === slug) || null, [categories]);
  // Inline style that colours an element in its activity type's colour.
  const tint = useCallback(
    (slug) => {
      const color = categoryOf(slug)?.color;
      return color ? { "--cal-c": color } : undefined;
    },
    [categoryOf]
  );

  const openDetail = useCallback((activity, date) => setDetail({ activity, date }), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const introPoints = splitList(copy.introPoints);

  return (
    <div className="rtg-cal">
      <CalendarBackdrop />

      <CalendarHero copy={copy} today={today} activities={activities} categories={categories} tint={tint} />

      <section className="rtg-cal-section" id="calendar">
        <div className="rtg-cal-inner">
          <div className="rtg-cal-intro">
            <RhythmPanel copy={copy} today={today} activities={activities} categories={categories} tint={tint} onOpen={openDetail} />

            <Reveal className="rtg-cal-copy" delay={0.08}>
              <span className="rtg-cal-kicker">{copy.introKicker}</span>
              <h2 className="font-display">
                <span>{copy.introTitle}</span>
                <span className="text-gradient">{copy.introTitleAccent}</span>
              </h2>
              <p>{copy.introText}</p>
              <div className="rtg-cal-dots">
                {introPoints.map((point, i) => (
                  <span key={point} className="contents">
                    {i > 0 && <i />}
                    <span>{point}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <MonthCalendar copy={copy} today={today} activities={activities} categories={categories} tint={tint} onOpen={openDetail} />
        </div>
      </section>

      <ActivityModal detail={detail} copy={copy} categoryOf={categoryOf} tint={tint} onClose={closeDetail} />
    </div>
  );
}
