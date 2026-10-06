import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { buildHomeWaysCopy, useHomeWays } from "../../lib/publicData";
import Reveal from "../ui/Reveal";

const ADVANCE_MS = 3600;
const SLIDE_EASE = [0.22, 0.78, 0.2, 1];

// One card at a time, right -> left: the next card slides in from just
// off the right edge while the current one leaves to the left.
const cardMotion = {
  enter: { x: "112%", scale: 0.985, opacity: 0 },
  active: { x: "0%", scale: 1, opacity: 1 },
  exit: { x: "-112%", scale: 0.985, opacity: 0 },
};
const cardTransition = {
  x: { duration: 0.88, ease: SLIDE_EASE },
  scale: { duration: 0.88, ease: SLIDE_EASE },
  opacity: { duration: 0.52 },
};

// "More Ways to Move Together" — a single photo card on the left that
// advances on its own (paused while hovered or focused, dots to jump),
// heading and copy on the right. No background of its own: the fixed
// SiteBackground shows through.
export default function WaysToMove({ settings, images }) {
  const copy = useMemo(() => buildHomeWaysCopy(settings), [settings]);
  const cards = useHomeWays();
  const count = cards.length;

  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  // The timer restarts whenever `index` changes, so clicking a dot never
  // gets undone by an auto-advance a moment later.
  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, index]);

  if (count === 0) return null;
  const current = cards[index % count];
  const pause = (value) => () => {
    paused.current = value;
  };

  return (
    <section id="ways" className="relative overflow-hidden py-16 md:pt-[72px] md:pb-20">
      <div className="max-w-[1220px] mx-auto px-6 md:px-9 grid lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-start">
        <Reveal direction="right" className="flex flex-col items-center order-2 lg:order-1">
          <div
            className="relative w-full h-[460px] sm:h-[555px] rounded-[34px] overflow-hidden"
            onMouseEnter={pause(true)}
            onMouseLeave={pause(false)}
            onFocus={pause(true)}
            onBlur={pause(false)}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={current.id || current.title}
                className="absolute inset-0"
                variants={cardMotion}
                initial="enter"
                animate="active"
                exit="exit"
                transition={cardTransition}
              >
                <Link to={current.link || "/community"} className="rtg-way-card group flex flex-col gap-2 h-full p-2.5 overflow-hidden">
                  <div className="rtg-way-photo relative flex-1 min-h-0 overflow-hidden">
                    <img
                      src={current.image || images[current.imageKey]}
                      alt={current.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="rtg-way-info relative shrink-0 min-h-[140px] sm:min-h-[160px] flex items-end gap-5 px-[22px] pt-5 pb-[19px] backdrop-blur-lg">
                    <div className="min-w-0 max-w-[220px]">
                      {current.kicker && (
                        <span className="block mb-2 text-[9px] font-bold tracking-[0.16em] uppercase text-rtg-orange-500">
                          {current.kicker}
                        </span>
                      )}
                      <h3 className="font-display text-[35px] leading-[0.95] tracking-[0.01em] text-[#342d3d] mb-2.5">{current.title}</h3>
                      <p className="text-[12.5px] font-semibold leading-[1.4] uppercase text-[#716a78]">{current.desc}</p>
                    </div>
                    <span className="rtg-way-arrow shrink-0 mb-0.5 w-12 h-12 rounded-full grid place-items-center text-[21px] leading-none text-rtg-orange-500" aria-hidden="true">
                      ➜
                    </span>
                  </div>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-2 mt-[18px]">
            {cards.map((c, i) => (
              <button
                key={c.id || c.title}
                onClick={() => setIndex(i)}
                aria-label={`Show ${c.title}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index % count ? "w-7 bg-rtg-orange-500" : "w-2 bg-[rgba(53,36,111,0.2)] hover:bg-[rgba(53,36,111,0.35)]"
                }`}
              />
            ))}
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1} className="max-w-[520px] lg:pt-5 order-1 lg:order-2">
          <span className="flex items-center gap-3 mb-[15px] text-[10px] font-semibold tracking-[0.24em] uppercase text-[#ff7b2c]">
            <span className="w-11 h-px bg-gradient-to-r from-transparent to-[rgba(255,123,44,0.72)]" />
            {copy.eyebrow}
          </span>
          <h2 className="font-display text-[clamp(3.5rem,6.2vw,7.375rem)] leading-[0.88] text-[#3d316e]">
            {copy.title} <span className="block text-gradient">{copy.titleAccent}</span>
          </h2>
          <p className="mt-5 max-w-[500px] text-base leading-[1.58] text-[#6e6774]">{copy.description}</p>
          {copy.descriptionExtra && (
            <p className="mt-3 max-w-[500px] text-sm leading-[1.58] text-[#8a8290]">{copy.descriptionExtra}</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
