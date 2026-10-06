import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildHomeEventsCopy, useEvents } from "../../lib/publicData";
import Reveal from "../ui/Reveal";

const AUTO_ADVANCE_MS = 6500;

// "RTG MTB Challenge 2026" -> ["RTG MTB", "Challenge 2026"]: the second
// part is drawn in the accent gradient. Uses the event's own accent text
// when it's set and really is the end of the title; otherwise the second
// half of the words.
function splitTitle(title = "", accent) {
  const wanted = (accent || "").trim();
  if (wanted && title.toLowerCase().endsWith(wanted.toLowerCase())) {
    return [title.slice(0, title.length - wanted.length).trim(), title.slice(title.length - wanted.length)];
  }
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

const SLIDE_PILL =
  "px-3.5 py-2.5 rounded-full border border-white/15 bg-[rgba(28,20,45,0.54)] backdrop-blur-md text-[9px] font-bold tracking-[0.06em] uppercase text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(8,5,15,0.16)]";
const SLIDE_BUTTON =
  "inline-flex items-center justify-center min-h-[52px] px-[26px] rounded-full text-[13px] font-bold tracking-[0.11em] uppercase text-white transition-all duration-300 hover:-translate-y-0.5";

function EventSlide({ event, copy, images, state }) {
  const [titleMain, titleAccent] = splitTitle(event.title, event.home.titleAccent);
  const pills = event.home.pills.length ? event.home.pills : [event.date, ...(event.categories || [])].filter(Boolean);
  const hasSideCard = event.home.highlightTitle || event.home.highlightText;

  return (
    <article className={`rtg-event-slide relative overflow-hidden ${state ? `is-${state}` : ""}`} aria-hidden={state !== "active"}>
      <img
        src={event.image || images.eventFeatured}
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-[1.03] saturate-[0.92] contrast-[1.02]"
      />
      <div className="absolute inset-0 bg-[rgba(18,12,31,0.58)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,8,24,0.26)_0%,rgba(13,8,24,0.08)_42%,rgba(13,8,24,0.18)_100%)]" />

      <div className="relative grid gap-[26px] items-end min-h-[420px] p-6 md:p-[38px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.47fr)]">
        <div>
          {event.type && (
            <span className="inline-flex mb-4 px-3.5 py-[9px] rounded-full border border-white/20 bg-white/13 backdrop-blur-md text-[9px] font-bold tracking-[0.15em] uppercase text-[#ff8a42] shadow-[inset_1px_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(7,4,14,0.15)]">
              {event.type}
            </span>
          )}
          <h3 className="font-display text-[clamp(2.5rem,3.4vw,4rem)] leading-[0.92] text-white mb-3.5">
            {titleMain}{" "}
            {titleAccent && (
              <span className="bg-[linear-gradient(90deg,#ff9a45_0%,#ff742d_42%,#ff7864_72%,#d976a4_100%)] bg-clip-text text-transparent">
                {titleAccent}
              </span>
            )}
          </h3>
          {event.desc && <p className="max-w-[640px] mb-5 text-[12.5px] leading-normal text-white/85">{event.desc}</p>}
          {pills.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mb-[22px]">
              {pills.map((pill) => (
                <span key={pill} className={SLIDE_PILL}>
                  {pill}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/events/${event.slug || event.id}`}
              className={`${SLIDE_BUTTON} btn-shine bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] shadow-[0_14px_28px_rgba(247,107,28,0.22)]`}
            >
              {copy.primaryLabel}
            </Link>
            <Link
              to={event.home.secondaryLink || copy.secondaryLink}
              className={`${SLIDE_BUTTON} border border-white/30 bg-white/8 backdrop-blur-md hover:bg-white/15`}
            >
              {event.home.secondaryLabel || copy.secondaryLabel}
            </Link>
          </div>
        </div>

        {hasSideCard && (
          <div className="relative px-6 py-[22px] rounded-[28px] border border-white/15 bg-[rgba(25,18,42,0.67)] backdrop-blur-lg shadow-[inset_1px_1px_0_rgba(255,255,255,0.14),0_18px_38px_rgba(8,5,15,0.22)]">
            {event.home.highlightLabel && (
              <small className="block mb-2.5 text-[10px] font-bold tracking-[0.16em] uppercase text-[#ff8a42]">{event.home.highlightLabel}</small>
            )}
            {event.home.highlightTitle && <strong className="block mb-3 text-[22px] font-bold leading-[1.15] text-white">{event.home.highlightTitle}</strong>}
            {event.home.highlightText && <p className="text-[15px] leading-[1.55] text-white/80">{event.home.highlightText}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

// "Upcoming Events" — one large photo card per event (see `events` below
// for which ones), shown one at a time with its neighbours ghosted either
// side. Advances on its own, paused while hovered. No background of
// its own: the fixed SiteBackground shows through.
export default function UpcomingEvents({ settings, images }) {
  const copy = useMemo(() => buildHomeEventsCopy(settings), [settings]);
  const allEvents = useEvents();
  // The events an admin ticked "Featured on homepage". If none are ticked,
  // every event that isn't filed under Past Highlights is shown instead, so
  // a newly added event appears here without an extra step.
  const events = useMemo(() => {
    const featured = allEvents.filter((e) => e.featured);
    return featured.length ? featured : allEvents.filter((e) => e.status !== "Past");
  }, [allEvents]);
  const count = events.length;

  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count]);

  const active = count ? index % count : 0;
  const stateOf = (i) => {
    if (i === active) return "active";
    if (i === (active - 1 + count) % count) return "prev";
    if (i === (active + 1) % count) return "next";
    return "";
  };

  return (
    <section id="upcoming-events" className="relative overflow-hidden px-6 md:px-10 pt-16 pb-14 md:pt-[78px] md:pb-[70px]">
      <Reveal className="flex flex-col items-center text-center max-w-[1180px] mx-auto mb-[30px]">
        <span className="mb-3 text-[10px] font-semibold tracking-[0.24em] uppercase text-rtg-orange-500">{copy.eyebrow}</span>
        <h2 className="font-display text-[clamp(3.25rem,5.4vw,6.375rem)] leading-[0.88] text-[#3d316e]">
          {copy.title} <span className="text-gradient">{copy.titleAccent}</span>
        </h2>
        <p className="mt-[17px] max-w-[760px] text-sm leading-[1.58] text-[#716a76]">{copy.subtitle}</p>
      </Reveal>

      {count === 0 ? (
        <p className="text-center text-rtg-mist py-6">{copy.emptyText}</p>
      ) : (
        <div
          className="relative grid max-w-[1180px] mx-auto"
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
        >
          {events.map((event, i) => (
            <EventSlide key={event.id} event={event} copy={copy} images={images} state={stateOf(i)} />
          ))}
        </div>
      )}

      <div className="relative flex justify-center mt-6">
        <Link
          to={copy.allLink}
          className="btn-shine inline-flex items-center justify-center gap-3.5 min-h-[50px] px-7 rounded-full bg-gradient-to-r from-[#f45b18] via-[#ff7a1a] to-[#ff9a45] text-[11px] font-bold tracking-[0.08em] uppercase text-white shadow-[0_12px_26px_rgba(247,107,28,0.18),inset_1px_1px_0_rgba(255,255,255,0.25)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {copy.allLabel}
          <b className="font-black">→</b>
        </Link>
      </div>
    </section>
  );
}
