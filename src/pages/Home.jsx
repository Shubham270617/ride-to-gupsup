import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { whyJoin, heroSlides } from "../data/content";
import { useEvents, useProducts, useTestimonials, useGalleryItems, useSponsors, useSiteImages, useSiteSettings, pickText, useWeeklySessions, useStates } from "../lib/publicData";
import CommunityProof from "../components/sections/CommunityProof";
import Section from "../components/ui/Section";
import FloatingIcons from "../components/ui/FloatingIcons";
import Button from "../components/ui/Button";
import GlassCard from "../components/ui/GlassCard";
import EventCard from "../components/ui/EventCard";
import ProductCard from "../components/ui/ProductCard";
import MasonryGallery from "../components/ui/MasonryGallery";
import RotatingPhotoWheel from "../components/ui/RotatingPhotoWheel";
import TestimonialSlider from "../components/ui/TestimonialSlider";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import useIsMobile from "../hooks/useIsMobile";
import { heroSrcSet, heroFallbackSrc } from "../lib/responsiveImage";

const HeroScene = lazy(() => import("../three/HeroScene"));

const HERO_SLIDE_DURATION = 6000;

// Per-slide "cinematic scene" metric card + sport-specific decorative SVG —
// mirrors the live reference's cin-glass-card-v29 / cin-route-v29 /
// cin-track-v29 / cin-elevation-v29 / cin-network-v29 treatment (a route for
// cycling, a track oval for running, an elevation profile for the 3rd slide,
// and a connection web for community), rebuilt with the shared
// rtg-route-dash / rtg-pulse-dot classes instead of copying raw CSS 1:1.
// Keyed by heroSlides[i].tag so it stays correct if slide order changes.
const HERO_SCENES = {
  Cycling: {
    kicker: "SATURDAY · TRAIN · REPEAT",
    heading: "RIDGE REPEATS",
    metrics: [["5×", "LOOPS"], ["45", "KM"], ["YOU", "VS YOU"]],
    viewBox: "0 0 520 420",
    path: "M34 338C102 258 130 294 177 209C222 129 282 221 326 136C367 56 420 90 484 38",
    dotStart: [34, 338],
    dotEnd: [484, 38],
  },
  Running: {
    kicker: "RUN · BUILD · RECOVER",
    heading: "BRICK & BURN",
    metrics: [["RIDE", "60M"], ["RUN", "40M"], ["MOVE", "BETTER"]],
    viewBox: "0 0 520 420",
    track: true,
    path: "M74 218h76l22-42 35 96 39-117 38 103 31-62 29 22h94",
    dotStart: [74, 218],
    dotEnd: [168, 218],
  },
  Swimming: {
    kicker: "POOL · TECHNIQUE · CONFIDENCE",
    heading: "STROKE BY STROKE",
    metrics: [["1-3", "KM"], ["COACHED", ""], ["ALL", "LEVELS"]],
    viewBox: "0 0 520 420",
    wave: true,
    path: "M26 240c40-36 80-36 120 0s80 36 120 0 80-36 120 0 80 36 108 6",
    dotStart: [26, 240],
    dotEnd: [494, 246],
  },
  Community: {
    kicker: "RIDE · RUN · CONNECT",
    heading: "THIS IS RTG",
    metrics: [["500+", "MEMBERS"], ["70+", "CITIES"], ["1", "COMMUNITY"]],
    viewBox: "0 0 520 420",
    network: true,
    path: "M88 106 211 71 337 130 432 79M88 106l54 141 126 64 69-181M142 247l126-64 164 73M268 183l0 128",
    nodes: [[88, 106], [211, 71], [337, 130], [432, 79], [142, 247], [268, 183], [268, 311], [432, 256]],
  },
};

function HeroCinematicScene({ tag, index, total }) {
  const scene = HERO_SCENES[tag] || HERO_SCENES.Community;
  return (
    <div className="hidden md:block absolute right-[4%] top-1/2 -translate-y-1/2 w-[min(42vw,560px)] h-[min(40vw,520px)] pointer-events-none">
      <span className="absolute top-0 right-1 text-[10px] font-bold tracking-[0.2em] text-white/55">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>

      {/* Orbit rings — same inline-animation pattern used in Events.jsx / Community.jsx */}
      <div className="absolute inset-[4%] rounded-full border border-white/15" style={{ animation: "rtg-orbit-spin 24s linear infinite" }} />
      <div className="absolute inset-[18%] rounded-full border border-rtg-orange-400/30" style={{ animation: "rtg-orbit-spin-reverse 17s linear infinite" }} />

      {/* Sport-specific decorative path */}
      <svg viewBox={scene.viewBox} className="absolute inset-[4%_0_auto_0] w-full h-[78%] overflow-visible" fill="none">
        {scene.track && (
          <>
            <ellipse cx="270" cy="218" rx="194" ry="112" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
            <ellipse cx="270" cy="218" rx="150" ry="82" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
          </>
        )}
        {scene.network &&
          scene.nodes.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={6 + (i % 3) * 2} fill="#ae7edf" className="rtg-pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        <path
          d={scene.path}
          stroke="rgba(255,255,255,.26)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="rtg-route-dash"
        />
        {!scene.network && (
          <>
            <circle cx={scene.dotStart[0]} cy={scene.dotStart[1]} r="7" fill="#ff7b2e" className="rtg-pulse-dot" />
            <circle cx={scene.dotEnd[0]} cy={scene.dotEnd[1]} r="7" fill="#ff7b2e" />
          </>
        )}
      </svg>

      {/* Floating glass metric card */}
      <motion.div
        className="glass theme-night absolute left-0 bottom-[6%] w-[60%] rounded-2xl px-5 py-4"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="block text-[8px] font-bold tracking-[0.18em] text-rtg-orange-400 mb-1.5">{scene.kicker}</span>
        <strong className="block font-display text-2xl text-rtg-white leading-none">{scene.heading}</strong>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {scene.metrics.map(([b, label]) => (
            <span key={label || b} className="text-[10px] text-rtg-mist leading-tight">
              <b className="block text-rtg-white font-bold text-sm">{b}</b>
              {label}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// "Present Across India" marquee — mirrors the reference's
// #hero .presence-marquee / .places-window / .places-track mechanic: a
// masked-edge window containing the state-chip list rendered TWICE
// back-to-back (`.places-set` x2) so a seamless `translateX(0 -> -50%)`
// loop never shows a seam, plus a static "+ Expanding" pill outside the
// scrolling track. Reuses the shared `--animate-marquee` keyframe already
// defined in index.css (marquee 28s linear infinite, translateX(-50%))
// instead of inventing new global CSS. Pauses on hover (desktop only —
// touch devices simply keep scrolling, which is fine per the brief).
function PresenceMarquee() {
  const states = useStates();
  return (
    <div className="mt-6 md:mt-8 flex items-center gap-3 md:gap-4 max-w-full">
      <span className="hidden sm:inline-block shrink-0 text-[10px] md:text-xs font-black tracking-[0.14em] uppercase text-rtg-white/90">
        Present Across India
      </span>
      <div
        className="group flex-1 min-w-0 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]"
      >
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex items-center gap-2 pr-2 shrink-0">
              {states.map((s) => (
                <span
                  key={`${dup}-${s}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/10 text-white/85 text-[11px] font-semibold whitespace-nowrap"
                >
                  <MapPin size={10} className="text-rtg-orange-400 shrink-0" />
                  {s}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="hidden sm:inline-block shrink-0 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold text-rtg-orange-400 bg-rtg-orange-500/15 ring-1 ring-rtg-orange-400/30 whitespace-nowrap">
        + Expanding
      </span>
    </div>
  );
}

function Hero() {
  const images = useSiteImages();
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [slide, setSlide] = useState(0);
  const total = heroSlides.length;
  const current = heroSlides[slide];

  const goTo = (i) => setSlide(((i % total) + total) % total);

  const MOBILE_FOCUS_CLASS = { top: "object-top", center: "object-center", bottom: "object-bottom" };
  const mobileFocusClass = MOBILE_FOCUS_CLASS[current.mobileFocus] || "object-center";

  // Auto-advance — the effect re-runs (and so the timer restarts) whenever
  // `slide` changes, whether that change came from the timer itself or a
  // manual arrow click, so manually navigating never gets immediately
  // undone by an auto-advance a moment later.
  useEffect(() => {
    const t = setTimeout(() => goTo(slide + 1), HERO_SLIDE_DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  // `min-h-svh` (not `h-svh`) below — lets the section grow taller than one
  // viewport if its bottom-anchored content (headline + copy + buttons +
  // slide nav + presence marquee) needs more room than the viewport offers,
  // instead of clipping the top of the heading. Normally this still lands
  // at exactly viewport height, same as before.
  return (
    <section ref={ref} className="theme-night relative min-h-svh min-h-[640px] w-full overflow-hidden flex items-end">
      <motion.div style={{ y }} className="absolute inset-0 scale-100 sm:scale-110">
        <AnimatePresence mode="sync">
          <motion.img
            key={slide}
            src={heroFallbackSrc(images[current.imageKey])}
            srcSet={heroSrcSet(images[current.imageKey])}
            sizes="100vw"
            alt={current.tag}
            className={`rtg-kenburns absolute inset-0 w-full h-full object-cover ${mobileFocusClass} sm:object-center`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </AnimatePresence>
      </motion.div>
      {/* Reference's final cascade (.hero-merged, which supersedes an
          earlier light-fade .hero draft in the same stylesheet) uses one
          uniform dark scrim across the whole photo rather than a left-side
          fade-to-white — full-bleed photo, white H1 first line + gradient
          accent line, orange eyebrow. Matched here instead of the lighter
          earlier draft. */}
      <div className="absolute inset-0 bg-gradient-to-t from-rtg-purple-950 via-rtg-purple-950/50 to-rtg-purple-950/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-rtg-purple-950/65 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,rgba(247,107,28,.16),transparent_32%)]" />

      {!isMobile && (
        <div className="absolute inset-0 z-[5] mix-blend-screen opacity-80">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>
      )}

      {/* Per-slide cinematic scene — orbit rings, sport-specific route/track
          SVG, and a floating glass metric card, mirroring the reference's
          cin-scene-v29 treatment. Desktop/tablet only (hidden md:block
          inside), so mobile stays focused on the headline like the
          reference's own mobile overrides do. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <HeroCinematicScene tag={current.tag} index={slide} total={total} />
        </motion.div>
      </AnimatePresence>

      <motion.div style={{ opacity }} className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-16 md:pb-24 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hidden sm:block text-rtg-orange-400 font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
              Ride · Run · Explore · Connect
            </span>
            <h1 className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-[0.9] mb-6 max-w-5xl">
              {current.title}
              <br />
              <span className="text-gradient">{current.accent}</span>
            </h1>
            <p className="text-rtg-mist text-base md:text-xl max-w-xl mb-10 leading-relaxed">{current.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button to="/community" size="lg" icon={ArrowUpRight} className="w-full sm:w-auto">Join Community</Button>
          <Button to="/events" variant="secondary" size="lg" icon={ArrowDown} className="w-full sm:w-auto">Explore Events</Button>
        </motion.div>

        {/* Slide navigation — numbered tabs with an animated progress line
            (mirrors the auto-advance timer), plus arrows, counter, and dots. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="mt-10 md:mt-14"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 flex-1 max-w-2xl">
              {heroSlides.map((s, i) => (
                <button
                  key={s.tag}
                  onClick={() => goTo(i)}
                  className="relative pt-4 text-left"
                >
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-white/15" />
                  {i === slide && (
                    <motion.span
                      key={slide}
                      className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-rtg-orange-400 to-rtg-purple-300"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: HERO_SLIDE_DURATION / 1000, ease: "linear" }}
                    />
                  )}
                  <span className="block font-mono text-[11px] text-rtg-mist/60 mb-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`block text-xs md:text-sm font-bold tracking-[0.15em] uppercase transition-colors ${
                      i === slide ? "text-rtg-white" : "text-rtg-mist/40 hover:text-rtg-mist/70"
                    }`}
                  >
                    {s.tag}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-sm text-rtg-mist tracking-wide tabular-nums">
                {String(slide + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <button
                onClick={() => goTo(slide - 1)}
                aria-label="Previous slide"
                className="w-11 h-11 rounded-full border border-white/25 flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => goTo(slide + 1)}
                aria-label="Next slide"
                className="w-11 h-11 rounded-full border border-white/25 flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-8">
            {heroSlides.map((s, i) => (
              <button
                key={s.tag}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide ? "w-6 bg-rtg-orange-400" : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </motion.div>

        <PresenceMarquee />
      </motion.div>

      <div className="hidden lg:flex absolute left-6 md:left-10 bottom-6 z-10 items-center gap-2.5 text-rtg-mist text-[9px] font-bold tracking-[0.18em] uppercase">
        <span className="w-10 h-px bg-gradient-to-r from-rtg-orange-400 to-white/30" />
        Ride · Run · Explore · Connect
      </div>

      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-rtg-white/70"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown size={26} />
      </motion.div>
    </section>
  );
}

// "More Ways to Move Together" — single-card auto-advancing showcase.
// Mirrors the reference's #ways.rtg-ways-split-v9 .ways-stage-v9 /
// .way-card-v9 mechanic: ONE card visible at a time (photo + kicker + h3 +
// description + arrow), auto-advancing on an interval with a
// crossfade+slide transition between cards, plus clickable progress dots —
// NOT a 3-up grid. Same idiom as Merchandise.jsx's FeaturedDropRotator
// (AnimatePresence mode="wait", setInterval auto-advance, prev/next,
// progress indicator), adapted to this section's Running/Cycling/Community
// data (heroSlides, already wired to the hero — no new data introduced).
const WAYS_TAGS = ["Running", "Cycling", "Community"];
const WAYS_KICKERS = { Running: "RUN WITH RTG", Cycling: "RIDE WITH RTG", Community: "CONNECT WITH RTG" };
const WAYS_ADVANCE_MS = 4800;

function WaysToMove({ images }) {
  const cards = useMemo(() => heroSlides.filter((s) => WAYS_TAGS.includes(s.tag)), []);
  const [index, setIndex] = useState(0);
  const count = cards.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), WAYS_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;
  const current = cards[index];

  // Left photo / right text-info split — matches the reference exactly
  // (not a photo with text overlaid on it): a standalone rounded photo
  // card on the left, kicker + title + description + arrow button on the
  // right, both crossfading together as the active card changes.
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
        <div className="relative rounded-[28px] overflow-hidden aspect-[4/3] shadow-xl">
          <AnimatePresence mode="wait">
            <motion.img
              key={current.tag}
              src={images[current.imageKey]}
              alt={current.tag}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 0.78, 0.2, 1] }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.tag}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.5, ease: [0.22, 0.78, 0.2, 1] }}
            className="group"
          >
            <span className="inline-block text-rtg-orange-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {WAYS_KICKERS[current.tag] || current.title}
            </span>
            <h3 className="font-display text-rtg-white text-4xl md:text-5xl flex items-center gap-3 mb-3">
              {current.tag}
              <span className="w-11 h-11 rounded-full bg-rtg-orange-500/15 ring-1 ring-rtg-orange-400/40 flex items-center justify-center shrink-0">
                <ArrowUpRight size={20} className="text-rtg-orange-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </h3>
            <p className="text-rtg-mist text-base max-w-sm">{current.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots — clickable, mirrors .ways-progress-v9 span.is-active-v9 */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {cards.map((s, i) => (
          <button
            key={s.tag}
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.tag}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "w-7 bg-rtg-orange-500" : "w-2 bg-rtg-purple-950/20 hover:bg-rtg-purple-950/35"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// WHY RTG — continuous vertical auto-scroll card stack. Mirrors the
// reference's #about.why-rtg-split-v3 .why-slider-track-v3 mechanic
// (rtgWhyContinuousV5 keyframe: translateY(0) -> translateY(-1 * measured
// content height), card list duplicated back-to-back for a seamless loop,
// paused on hover via a class toggle) — rebuilt declaratively with
// Framer Motion's `animate` prop instead of raw CSS keyframes + JS-set
// custom properties, per the brief. The scroll distance is MEASURED off
// the actual rendered height of one set of cards (ref + state), not a
// hardcoded px value, so it stays correct regardless of how many `whyJoin`
// items exist or how tall they render at any viewport width.
function WhyRtgScroller({ items }) {
  const setRef = useRef(null);
  const [distance, setDistance] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (setRef.current) setDistance(setRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  // ~2.6s per card, same pacing feel as the reference's ~30s-for-a-full-set
  // default — scales with how many reasons exist instead of a fixed total.
  const duration = Math.max(items.length * 2.6, 8);

  const renderSet = (setIndex) => (
    <div
      key={setIndex}
      ref={setIndex === 0 ? setRef : undefined}
      aria-hidden={setIndex === 1}
      className="flex flex-col gap-5"
    >
      {items.map((w, i) => (
        <GlassCard key={`${setIndex}-${w.title}`} hover={false} className="relative rounded-[28px] shrink-0">
          <span className="absolute top-5 right-6 text-[10px] font-bold tracking-wide text-rtg-white/40">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{w.title}</h3>
          <p className="text-rtg-mist text-sm leading-relaxed">{w.desc}</p>
        </GlassCard>
      ))}
    </div>
  );

  return (
    <div
      className="relative h-[560px] md:h-[620px] overflow-hidden rounded-[28px] [mask-image:linear-gradient(180deg,transparent,#000_8%,#000_92%,transparent)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="flex flex-col gap-5"
        animate={distance ? { y: paused ? undefined : [0, -distance] } : undefined}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {renderSet(0)}
        {renderSet(1)}
      </motion.div>
    </div>
  );
}

// TRAINING FORMATS — tabbed section with a per-tab background photo
// crossfade, mirroring the reference's #training-formats "Ridge Repeats"
// (map/highlights layout) vs "Brick N Burn" (numbered step-flow layout)
// treatment — two genuinely different layouts, not one template reused with
// different text. Built on the new weekly_sessions.image_url/tags/steps/
// highlights fields (see supabase/migrations/001_weekly_sessions_training_
// detail.sql) with graceful derived fallbacks so it looks complete even
// before an admin has filled any of those in.
const deriveTags = (s) =>
  s.tags?.length ? s.tags : [s.day && s.time ? `${s.day} ${s.time}` : s.day, s.format, s.difficulty].filter(Boolean);
const deriveSteps = (s) => (s.steps?.length ? s.steps : [{ label: s.format || s.name, value: s.time || "" }]);
const deriveHighlights = (s) =>
  s.highlights?.length
    ? s.highlights
    : [
        { label: "Format", value: s.format },
        { label: "Focus", value: s.difficulty },
        { label: "Pace", value: s.paceGroup },
        { label: "Cost", value: s.cost },
      ].filter((h) => h.value);

function TrainingFormats({ sessions, images }) {
  const tabs = useMemo(() => sessions.slice(0, 2), [sessions]);
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  const current = tabs[active];
  const key = current.slug || current.id || current.name;
  const isFlow = active % 2 === 1; // alternates layout style by tab index
  const tags = deriveTags(current);

  return (
    <section className="theme-night relative overflow-hidden bg-rtg-purple-950">
      {/* Guaranteed-solid dark base (bg-rtg-purple-950 on the section itself,
          above) sits UNDER everything else, so the section can never wash
          out to the light page background no matter what state the photo
          crossfade below is in — the photo/gradient are enhancement layers
          on top of an already-correct dark surface, not the only source of
          darkness. */}
      <AnimatePresence mode="sync">
        <motion.div
          key={key}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <img src={current.image || images.homeWeekly} alt="" aria-hidden="true" className="w-full h-full object-cover rtg-kenburns" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgba(27,17,48,0.85)] via-[rgba(27,17,48,0.75)] to-[rgba(27,17,48,0.92)]" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <Reveal className="text-center max-w-2xl mx-auto mb-4">
          <span className="inline-block text-rtg-orange-500 font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
            Weekly Rhythm
          </span>
          <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">Training Formats</h2>
          <span className="section-underline center" />
        </Reveal>

        <div className="flex flex-wrap items-center justify-center gap-3 my-10">
          {tabs.map((s, i) => (
            <button
              key={s.slug || s.id || s.name}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${
                i === active ? "bg-rtg-orange-500 text-white" : "glass text-rtg-white/70 hover:text-rtg-white"
              }`}
            >
              {String(i + 1).padStart(2, "0")} {s.name}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {isFlow ? (
              <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
                <div className="glass rounded-[28px] p-6 order-2 lg:order-1">
                  <span className="text-rtg-orange-400 text-xs font-bold tracking-wide uppercase">{current.day} Session</span>
                  <h3 className="font-display text-2xl text-rtg-white mt-1 mb-5">{current.name}</h3>
                  <div className="space-y-4">
                    {deriveSteps(current).map((st, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-rtg-orange-500/20 ring-1 ring-rtg-orange-400/40 flex items-center justify-center text-rtg-orange-300 text-xs font-bold shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-rtg-white text-sm font-semibold truncate">{st.label}</span>
                          {st.value && <span className="block text-rtg-mist text-xs truncate">{st.value}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.9] mb-3">{current.name}</h2>
                  <p className="text-rtg-mist text-base md:text-lg max-w-xl mb-6">{current.description || current.format}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {tags.map((tag) => (
                      <span key={tag} className="glass px-3.5 py-1.5 rounded-full text-xs font-semibold text-rtg-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button to={current.slug ? `/weekly-rides/${current.slug}` : "/weekly-rides"} size="lg">
                    Explore Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
                <div>
                  <span className="text-rtg-orange-400 text-xs font-bold tracking-wide uppercase">
                    {[current.day, current.time].filter(Boolean).join(" · ")}
                  </span>
                  <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.9] my-3">{current.name}</h2>
                  <p className="text-rtg-mist text-base md:text-lg max-w-xl mb-6">{current.description || current.format}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {tags.map((tag) => (
                      <span key={tag} className="glass px-3.5 py-1.5 rounded-full text-xs font-semibold text-rtg-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button to={current.slug ? `/weekly-rides/${current.slug}` : "/weekly-rides"} size="lg">
                    Explore Now
                  </Button>
                </div>
                <div className="space-y-3">
                  {deriveHighlights(current).map((h) => (
                    <div key={h.label} className="glass rounded-2xl px-5 py-4">
                      <span className="block text-rtg-orange-400 text-[10px] font-bold tracking-wide uppercase mb-1">{h.label}</span>
                      <span className="block text-rtg-white text-sm font-semibold">{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="text-center mt-14">
          <Button to="/weekly-rides" variant="outline">See Full Weekly Schedule</Button>
        </div>
      </div>
    </section>
  );
}

const GALLERY_PREVIEW_CATEGORIES = ["All", "Cycling", "Running", "Swimming", "Events", "Volunteers", "Videos"];

export default function Home() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const t = (key, fallback) => pickText(settings, key, fallback);
  const events = useEvents();
  // Only events an admin has explicitly checked "Featured on homepage" —
  // this used to just show whatever the first 3 events were, regardless of
  // that checkbox.
  const featuredEvents = events.filter((e) => e.featured);
  const products = useProducts();
  const testimonials = useTestimonials();
  const galleryItems = useGalleryItems();
  const sponsors = useSponsors();
  const weeklySessions = useWeeklySessions();
  const [galleryFilter, setGalleryFilter] = useState("All");
  const filteredGallery = galleryItems.filter((item) => {
    if (galleryFilter === "All") return true;
    if (galleryFilter === "Videos") return item.type === "video";
    return item.category === galleryFilter;
  });
  return (
    <>
      <Hero />

      {/* ABOUT RTG — reference's #about "This Is RTG" / why-rtg-split
          section: headline + 6(-8) numbered reasons. */}
      <Section center={false} light>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="right">
            <span className="inline-block text-rtg-orange-500 font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
              {t("text.home.aboutEyebrow", "This Is RTG")}
            </span>
            <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">
              {t("text.home.aboutTitleLine1", "More Than Miles.")}
              <br />
              <span className="text-gradient">{t("text.home.aboutTitleLine2", "More Than Sport.")}</span>
            </h2>
            <p className="text-rtg-mist text-lg leading-relaxed mb-8 max-w-lg">
              {t(
                "text.home.aboutBody",
                "Ride Tea GupShup brings cyclists, runners, and endurance enthusiasts together to move, connect, learn, and create experiences worth remembering."
              )}
            </p>
            <Button to="/about" variant="outline">{t("text.home.aboutButtonLabel", "Discover Our Story")}</Button>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <RotatingPhotoWheel photos={galleryItems} />
          </Reveal>
        </div>
      </Section>

      {/* WHY JOIN — dark, photo-backed band (the brand reference's
          "Life at RTG" treatment). The reference scrolls this list as a
          continuous vertical auto-scroll card stack (why-slider-track-v3 /
          rtgWhyContinuousV5) rather than a static grid — rebuilt below with
          WhyRtgScroller using measured-height Framer Motion animation. */}
      <Section
        contentKey="home.whyJoin"
        eyebrow="Why RTG"
        title="Why Athletes Join RTG"
        subtitle={`${whyJoin.length} reasons endurance athletes across India call RTG home.`}
        dark
        image={images.homeWhyJoin}
      >
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <Reveal direction="right">
            <p className="text-rtg-mist text-base md:text-lg leading-relaxed max-w-md">
              From structured training to chai after every ride — here's what keeps athletes
              coming back, week after week.
            </p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <WhyRtgScroller items={whyJoin} />
          </Reveal>
        </div>
      </Section>

      {/* MORE WAYS TO MOVE — reference's #ways quick-entry showcase
          (Running / Cycling / Adventure cards). Reuses the same heroSlides
          tags/images already wired to the hero, no new data. */}
      <Section
        eyebrow="Find Your Way"
        title="More Ways to Move Together"
        subtitle="Run, ride or gather for chai — choose the way you want to move, connect and explore with RTG."
        light
      >
        <WaysToMove images={images} />
      </Section>

      {/* STATS / 500+ MEMBERS + PRESENCE */}
      <CommunityProof light />

      {/* TRAINING FORMATS — tabbed, per-tab background crossfade, mirrors
          the reference's #training-formats "RIDGE REPEATS" / "BRICK N BURN"
          treatment exactly (see TrainingFormats above). */}
      <TrainingFormats sessions={weeklySessions} images={images} />

      {/* UPCOMING EVENTS */}
      <Section contentKey="home.upcomingEvents" eyebrow="Don't Miss Out" title="Upcoming Events" light>
        {featuredEvents.length === 0 ? (
          <p className="text-center text-rtg-mist py-6 mb-2">
            No events are marked "Featured on homepage" yet — check the Events page for what's coming up.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Reveal className="md:col-span-2">
              <EventCard event={featuredEvents[0]} featured />
            </Reveal>
            {featuredEvents.slice(1, 3).map((e) => (
              <Reveal key={e.id}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        )}
        <div className="text-center">
          <Button to="/events" variant="outline">View All Events</Button>
        </div>
      </Section>

      {/* MERCH PREVIEW — reference's "Merchandise Highlights" sits on a
          dark community photo band. Placed above Gallery/Testimonials per
          request, so the order reads: Merch -> Sponsors -> Gallery ->
          Testimonials -> JoinCTA/Footer. */}
      <Section contentKey="home.store" eyebrow="RTG Store" title="Merchandise Highlights" subtitle="A quick look at the RTG collection — designed around the colours, energy and identity of the community." dark image={images.homeHero}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {products.slice(0, 4).map((p) => (
            <Reveal key={p.id}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <Button to="/merchandise" variant="outline">Shop All Merchandise</Button>
        </div>
      </Section>

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <Section contentKey="home.sponsors" eyebrow="Trusted By" title="Our Sponsors & Partners" subtitle="Brands that fuel the RTG movement." dark>
          <StaggerGroup className="flex flex-wrap items-center justify-center gap-6">
            {sponsors.map((s) => (
              <StaggerItem key={s.name}>
                {s.logo ? (
                  <a
                    href={s.website || "/sponsors"}
                    target={s.website ? "_blank" : undefined}
                    rel={s.website ? "noopener noreferrer" : undefined}
                    className="glass px-6 py-4 rounded-2xl flex items-center justify-center hover:border-rtg-orange-400/40 transition-colors"
                  >
                    <img src={s.logo} alt={s.name} className="h-10 w-auto object-contain" />
                  </a>
                ) : (
                  <div className="glass px-8 py-6 rounded-2xl text-rtg-white/60 font-display text-xl tracking-wide hover:text-rtg-orange-400 transition-colors">
                    {s.name}
                  </div>
                )}
              </StaggerItem>
            ))}
          </StaggerGroup>
          <div className="text-center mt-10">
            <Button to="/sponsors" variant="outline">Become a Sponsor</Button>
          </div>
        </Section>
      )}

      {/* GALLERY PREVIEW — sticky left content (text + CTA) with a normally
          scrolling right-hand image grid, matching the reference exactly:
          the left panel pins via plain CSS `position: sticky` (no manual
          scroll-transform JS) while the taller right column of images
          scrolls past it, then releases naturally once the grid's bottom
          edge (i.e. the end of the gallery images) reaches it — which is
          also exactly where Testimonials begins. Mobile drops the sticky
          behavior entirely (unprefixed classes default to a single stacked
          column; `md:` is what turns on the two-column + sticky layout). */}
      {/* No overflow-hidden on this section — it would create a new
          scroll-clipping container and silently break the sticky left
          column below (sticky positioning requires every ancestor between
          it and the viewport to have visible overflow). FloatingIcons
          already clips itself internally, so nothing bleeds regardless. */}
      <section className="relative isolate py-20 md:py-28 px-6 md:px-10 bg-rtg-canvas">
        <FloatingIcons />
        <div className="relative max-w-7xl mx-auto grid md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] gap-10 lg:gap-16 items-start">
          <div className="md:sticky md:top-28 self-start">
            <Reveal direction="right">
              <span className="inline-block text-rtg-orange-500 font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
                Moments That Become Stories
              </span>
              <h2 className="font-display text-rtg-white text-4xl md:text-6xl leading-[0.95] mb-4">
                Community <span className="text-gradient">Gallery.</span>
              </h2>
              <p className="text-rtg-mist text-base md:text-lg leading-relaxed mb-8 max-w-sm">
                Finish lines, sunrise starts, and everything in between.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {GALLERY_PREVIEW_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setGalleryFilter(c)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      galleryFilter === c ? "bg-rtg-orange-500 text-white" : "glass text-rtg-white/75 hover:text-rtg-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Button to="/gallery" variant="outline">Explore Full Gallery</Button>
            </Reveal>
          </div>

          {/* 12, not 8 — the right column needs real height for the sticky
              left panel to have room to work; the reference shows ~10
              photos here. Full archive is still on /gallery, this is just
              the preview cap. */}
          <div>
            {filteredGallery.length === 0 ? (
              <p className="text-center text-rtg-mist py-10">No {galleryFilter.toLowerCase()} moments yet — check back soon.</p>
            ) : (
              <MasonryGallery items={filteredGallery.slice(0, 12)} />
            )}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — immediately follows Gallery, always light, so the
          two read as one continuous light page flow with no hard visual
          break. */}
      <Section contentKey="home.testimonials" eyebrow="Athlete Voices" title="What Our Community Says" light>
        <TestimonialSlider items={testimonials} />
      </Section>

      {/* Newsletter signup removed — not part of the real reference Home page.
          The component itself still exists (src/components/sections/Newsletter.jsx)
          and stays in use elsewhere if it's wanted there; just not here. */}
      {/* Instagram feed hidden for now, per request — planned for next sprint. Re-add <InstagramFeed /> here when ready. */}
    </>
  );
}
