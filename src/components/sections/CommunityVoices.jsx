import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildHomeVoicesCopy, useTestimonials } from "../../lib/publicData";
import Reveal from "../ui/Reveal";

const AUTO_ADVANCE_MS = 6000;

// Next / autoplay: the old card leaves to the left, the new one comes in
// from the right. Previous: mirrored. `direction` is +1 or -1.
const slideMotion = {
  enter: (direction) => ({ x: `${direction * 108}%`, opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (direction) => ({ x: `${direction * -108}%`, opacity: 0 }),
};
const slideTransition = {
  x: { duration: 0.72, ease: [0.22, 0.72, 0.22, 1] },
  opacity: { duration: 0.5 },
};

const ARROW =
  "w-[42px] h-[42px] rounded-full grid place-items-center border border-[rgba(53,36,111,0.1)] bg-white/72 text-lg text-[#35246f] shadow-[0_4px_10px_rgba(0,0,0,0.09)] transition-colors duration-300 hover:bg-rtg-orange-500 hover:text-white";

// "What People Say" — the testimonials (Admin -> Testimonials) one at a
// time in a soft lilac card: quote, round photo, name and role. Slides
// sideways on its own every few seconds (paused while hovered), with
// arrows and dots. No background of its own: the fixed SiteBackground
// shows through.
export default function CommunityVoices({ settings }) {
  const copy = useMemo(() => buildHomeVoicesCopy(settings), [settings]);
  const voices = useTestimonials();
  const count = voices.length;

  const [[index, direction], setSlide] = useState([0, 1]);
  const paused = useRef(false);

  const go = (step) => setSlide(([i]) => [(i + step + count) % count, step > 0 ? 1 : -1]);
  const goTo = (target) => setSlide(([i]) => (target === i ? [i, 1] : [target, target > i ? 1 : -1]));

  // Restarts whenever the slide changes, so a click gets a full interval.
  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (!paused.current) setSlide(([i]) => [(i + 1) % count, 1]);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, index]);

  if (count === 0) return null;
  const active = index % count;
  const voice = voices[active];

  return (
    <section id="community-voices" className="relative overflow-hidden px-6 py-16 md:py-[82px]">
      <Reveal className="max-w-[1180px] mx-auto mb-7 text-center">
        <span className="inline-block mb-3 text-[10px] font-semibold leading-none tracking-[0.24em] uppercase text-rtg-orange-500">{copy.eyebrow}</span>
        <h2 className="font-display text-[clamp(3.25rem,5.4vw,6.375rem)] leading-[0.88] text-[#3d316e]">
          {copy.title} <span className="text-gradient">{copy.titleAccent}</span>
        </h2>
      </Reveal>

      <div
        className="relative grid max-w-[980px] mx-auto overflow-hidden rounded-[33px]"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.article
            key={active}
            custom={direction}
            variants={slideMotion}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="[grid-area:1/1] flex flex-col items-center justify-center gap-[18px] min-h-[300px] px-6 md:px-[58px] pt-10 pb-[34px] rounded-[33px] border border-[rgba(83,67,128,0.12)] bg-[rgba(83,67,128,0.12)] text-center"
          >
            <div aria-hidden="true" className="-mb-0.5 font-display text-[72px] leading-[0.58] rotate-180 text-rtg-orange-500 opacity-80">
              ”
            </div>
            <blockquote className="max-w-[730px] text-xl md:text-[26px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#3d316e]">
              “{voice.quote}”
            </blockquote>
            <div className="flex flex-col items-center gap-2 mt-1.5">
              {voice.image && (
                <img
                  src={voice.image}
                  alt={voice.name}
                  className="w-[62px] h-[62px] rounded-full object-cover border-2 border-rtg-orange-500 shadow-[0_5px_0_rgba(0,0,0,0.05),0_12px_26px_rgba(0,0,0,0.14)]"
                />
              )}
              <div>
                <strong className="block font-display font-normal text-2xl leading-none tracking-[0.015em] text-[#3d316e]">{voice.name}</strong>
                {voice.role && <span className="block mt-1.5 text-[10px] font-medium leading-[1.35] text-[#756e7b]">{voice.role}</span>}
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="relative flex items-center justify-center gap-3.5 mt-[22px]">
          <button type="button" onClick={() => go(-1)} aria-label={copy.prevLabel} className={ARROW}>
            ←
          </button>
          <div className="flex items-center justify-center gap-[9px]">
            {voices.map((v, i) => (
              <button
                key={`${v.name}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={v.name}
                className={`h-[7px] rounded-full transition-all duration-300 ${
                  i === active ? "w-[30px] bg-rtg-orange-500" : "w-[7px] bg-[rgba(53,36,111,0.18)] hover:bg-[rgba(53,36,111,0.35)]"
                }`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label={copy.nextLabel} className={ARROW}>
            →
          </button>
        </div>
      )}
    </section>
  );
}
