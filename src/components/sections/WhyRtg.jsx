import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildHomeWhyCopy, useWhyReasons } from "../../lib/publicData";
import Reveal from "../ui/Reveal";

// Line-art for each reason card, picked by the card's `icon` value (the
// dropdown in Admin -> Why RTG Cards — keep WHY_ICON_OPTIONS in
// admin/resourceConfig.js in step with these keys). All drawn in a 64x48 box.
const WHY_ICONS = {
  training: (
    <>
      <circle cx="13" cy="34" r="9" />
      <circle cx="43" cy="34" r="9" />
      <path d="M13 34 25 17h9l9 17M25 17l7 17M22 23h19M27 10h8" />
      <circle cx="51" cy="12" r="4" />
      <path d="M51 16v12m0-7 7 4m-7-2-7 8" />
    </>
  ),
  community: (
    <>
      <circle cx="32" cy="14" r="7" />
      <circle cx="16" cy="18" r="6" />
      <circle cx="48" cy="18" r="6" />
      <path d="M20 39c0-9 5-14 12-14s12 5 12 14M5 39c0-7 4-12 11-12 3 0 5 1 7 3M59 39c0-7-4-12-11-12-3 0-5 1-7 3" />
    </>
  ),
  running: (
    <>
      <circle cx="20" cy="9" r="5" />
      <path d="M19 14 14 22l8 8 6-7 6 4 7 13" />
      <path d="M25 19l14-4 10 6M21 30l-10 9M40 33l5 11 11 3" />
    </>
  ),
  cycling: (
    <>
      <circle cx="14" cy="34" r="8" />
      <circle cx="44" cy="34" r="8" />
      <path d="M14 34 26 17h8l8 17M26 17l6 17M23 23h18M42 18l11-7" />
      <path d="M50 7v13l7 3" />
    </>
  ),
  consistency: (
    <>
      <circle cx="32" cy="18" r="12" />
      <path d="M32 6v12l8 5" />
      <path d="M20 41h24" />
    </>
  ),
  recognition: (
    <>
      <circle cx="32" cy="20" r="12" />
      <path d="M32 9l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" />
      <path d="M18 43h28" />
    </>
  ),
  adventure: <path d="M7 39 25 18l10 10 8-9 14 20M25 18l4 8M42 19V7h11l-3 4 3 4H42" />,
  memories: (
    <>
      <path d="M10 38h44" />
      <path d="M13 30h17l6-7 6 6h9" />
      <circle cx="20" cy="22" r="3" />
      <circle cx="47" cy="16" r="3" />
    </>
  ),
};

// Pixels per second the card stack travels. 60 = relaxed, 70 = calm,
// 90 = active, 110 = fast.
const SCROLL_SPEED = 70;

function ReasonCard({ reason, number }) {
  return (
    <article className="rtg-why-card shrink-0">
      <span className="absolute top-[18px] right-[22px] text-[9px] font-bold tracking-[0.16em] text-[#a79eb6]">{number}</span>
      <div className="grid justify-items-center gap-2 text-center sm:grid-cols-[58px_minmax(0,1fr)] sm:justify-items-stretch sm:gap-[15px] sm:items-start sm:text-left">
        <div className="rtg-why-icon" aria-hidden="true">
          <svg viewBox="0 0 64 48" className="w-[34px] h-[34px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {WHY_ICONS[reason.icon] || WHY_ICONS.training}
          </svg>
        </div>
        <div className="min-w-0">
          {reason.pill && (
            <span className="mx-auto mb-[7px] flex w-fit items-center min-h-[22px] px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-bold tracking-[0.12em] uppercase text-[#7f6c9d] bg-gradient-to-r from-[rgba(255,126,36,0.14)] to-[rgba(97,96,255,0.1)]">
              {reason.pill}
            </span>
          )}
          <h3 className="font-display text-[22px] sm:text-[32px] leading-[0.95] tracking-[0.015em] text-[#312b39] mb-[7px]">{reason.title}</h3>
          <p className="text-[11.5px] sm:text-[13px] leading-[1.52] text-[#756e7b]">{reason.desc}</p>
        </div>
      </div>
    </article>
  );
}

// The right-hand card stack. On desktop the list is rendered twice and the
// track slides up by exactly one copy's height, forever — bottom to top,
// pausing while hovered. The distance is MEASURED (first card of copy 2
// minus first card of copy 1, so it includes every card and gap) after the
// display fonts have loaded, because a late font swap changes card heights
// and would make the loop point jump. Same on phones, just narrower: the
// stack still scrolls beside the headline.
function ReasonStack({ reasons }) {
  const trackRef = useRef(null);
  const [scroll, setScroll] = useState(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let cancelled = false;

    const measure = () => {
      const cards = track.children;
      const first = cards[0];
      const firstOfCopy = cards[cards.length / 2];
      if (cancelled || !first || !firstOfCopy) return;
      const distance = firstOfCopy.offsetTop - first.offsetTop;
      if (distance > 0) setScroll({ distance, duration: distance / SCROLL_SPEED });
    };

    (document.fonts?.ready ?? Promise.resolve()).then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [reasons]);

  return (
    <div className="rtg-why-mask relative h-[520px] lg:h-[610px] overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_8%,#000_92%,transparent)]">
      <div
        ref={trackRef}
        className={`rtg-why-track flex flex-col gap-3 sm:gap-4 px-1 sm:px-2 py-3.5 ${scroll ? "is-scrolling" : ""}`}
        style={scroll ? { "--why-scroll-distance": `${scroll.distance}px`, "--why-scroll-duration": `${scroll.duration}s` } : undefined}
      >
        {[0, 1].flatMap((copy) =>
          reasons.map((r, i) => (
            <div key={`${copy}-${r.id || r.title}`} aria-hidden={copy === 1}>
              <ReasonCard reason={r} number={String(i + 1).padStart(2, "0")} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// "Why RTG" — headline on the left, auto-scrolling reason cards on the
// right, one button underneath. No background of its own: the fixed
// SiteBackground shows through.
export default function WhyRtg({ settings }) {
  const copy = useMemo(() => buildHomeWhyCopy(settings), [settings]);
  const reasons = useWhyReasons();

  return (
    <section id="about" className="relative overflow-hidden py-16 md:py-[78px]">
      <div className="max-w-[1220px] mx-auto px-2.5 sm:px-6 md:px-9 grid grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] gap-3 sm:gap-8 lg:gap-[42px] items-center">
        <Reveal direction="right" className="max-w-[520px]">
          <div className="flex items-center gap-2 sm:gap-3.5 mb-3.5 text-[7px] sm:text-[10px] font-black tracking-[0.24em] uppercase text-[#ff7b2c]">
            <span className="w-4 sm:w-[46px] h-px opacity-55 bg-gradient-to-r from-transparent to-[rgba(255,123,44,0.68)]" />
            {copy.eyebrow}
            <span className="w-4 sm:w-[46px] h-px opacity-55 bg-gradient-to-l from-transparent to-[rgba(255,123,44,0.68)]" />
          </div>
          <h2 className="font-display text-[clamp(2.75rem,6.4vw,7.625rem)] leading-[0.88] text-[#3d316e]">
            <span className="block">{copy.titleLine1}</span>
            <span className="block text-gradient">{copy.titleLine2}</span>
          </h2>
          <p className="mt-[18px] text-[13px] sm:text-base md:text-[17px] leading-[1.6] text-[#6c6672]">{copy.subtitle}</p>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <ReasonStack reasons={reasons} />
        </Reveal>
      </div>

      <div className="relative mt-8 lg:mt-6 px-6 flex justify-center">
        <Link
          to={copy.ctaLink}
          className="btn-shine inline-flex items-center gap-3.5 min-h-[50px] px-7 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase text-white bg-gradient-to-r from-[#ff7d23] via-[#ff9435] to-[#ffb36a] shadow-[0_14px_28px_rgba(255,123,44,0.18)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {copy.ctaLabel}
          <b className="font-black">→</b>
        </Link>
      </div>
    </section>
  );
}
