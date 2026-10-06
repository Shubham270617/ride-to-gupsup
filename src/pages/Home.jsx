import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useSiteImages, useSiteSettings, buildHeroSlides, buildHeroCopy, buildStats, pickStates } from "../lib/publicData";
import WhyRtg from "../components/sections/WhyRtg";
import WaysToMove from "../components/sections/WaysToMove";
import TrainingFormats from "../components/sections/TrainingFormats";
import UpcomingEvents from "../components/sections/UpcomingEvents";
import MerchHighlights from "../components/sections/MerchHighlights";
import GalleryShowcase from "../components/sections/GalleryShowcase";
import CommunityVoices from "../components/sections/CommunityVoices";
import Button from "../components/ui/Button";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import { heroSrcSet, heroFallbackSrc } from "../lib/responsiveImage";

const HERO_SLIDE_DURATION = 6000;
const HERO_EASE = [0.22, 1, 0.36, 1];

// Decorative line-art for the hero's right-hand "cinematic scene" — a route
// for cycling, a track oval for running, a wave for swimming, a connection
// web for community. Pure artwork (no copy), picked by heroSlides[i].scene;
// all the scene's words and numbers come from the slide itself, which is
// admin-editable. Every path is drawn in the same 520x420 box.
const SCENE_VIEWBOX = "0 0 520 420";
const SCENE_ART = {
  route: {
    path: "M34 338C102 258 130 294 177 209C222 129 282 221 326 136C367 56 420 90 484 38",
    dots: [[34, 338], [177, 209], [484, 38]],
    icon: "bike",
  },
  track: {
    ovals: [[194, 112], [150, 82]],
    path: "M74 218h76l22-42 35 96 39-117 38 103 31-62 29 22h94",
    dots: [[74, 218], [438, 218]],
    icon: "run",
  },
  wave: {
    path: "M26 240c40-36 80-36 120 0s80 36 120 0 80-36 120 0 80 36 108 6",
    dots: [[26, 240], [494, 246]],
    icon: "watch",
  },
  network: {
    path: "M88 106 211 71 337 130 432 79M88 106l54 141 126 64 69-181M142 247l126-64 164 73M268 183l0 128",
    nodes: [[88, 106], [211, 71], [337, 130], [432, 79], [142, 247], [268, 183], [268, 311], [432, 256]],
  },
};

// Same line-art (and the same idle float keyframes) as ui/FloatingIcons.
const SCENE_ICONS = {
  bike: {
    viewBox: "0 0 170 105",
    animation: "rtg-float-bike 8.5s ease-in-out infinite",
    shape: (
      <>
        <circle cx="38" cy="72" r="27" />
        <circle cx="131" cy="72" r="27" />
        <path d="M38 72 67 37l29 35H38l29-35 27-5 37 40" />
        <path d="M86 32h17" />
        <path d="m93 32 6-14" />
      </>
    ),
  },
  run: {
    viewBox: "0 0 150 150",
    animation: "rtg-float-run 7.5s ease-in-out infinite",
    shape: (
      <>
        <circle cx="91" cy="22" r="9" />
        <path d="M82 37 65 54l12 20 19-13 12 17" />
        <path d="M66 54 44 60 27 50" />
        <path d="M77 74 58 98 34 118" />
        <path d="M79 75 98 98l25 10" />
        <path d="M99 98 121 126" />
        <path d="M58 98 50 130" />
        <path d="M95 40 114 53l19-2" />
      </>
    ),
  },
  watch: {
    viewBox: "0 0 100 110",
    animation: "rtg-float-watch 10s ease-in-out infinite",
    shape: (
      <>
        <circle cx="50" cy="61" r="34" />
        <path d="M50 27V14M38 12h24M73 35l9-9M50 61l15-11" />
      </>
    ),
  },
};

const pad2 = (n) => String(n).padStart(2, "0");

function HeroCinematicScene({ slide, index, total }) {
  const art = SCENE_ART[slide.scene] || SCENE_ART.network;
  const icon = SCENE_ICONS[art.icon];
  const { card } = slide;

  return (
    <>
      <span className="absolute top-0 right-[7%] text-[10px] font-bold tracking-[0.2em] text-white/60 tabular-nums">
        {pad2(index + 1)} / {pad2(total)}
      </span>

      {/* Orbit rings — each carries a dot so the slow spin actually reads */}
      <div
        className="absolute right-0 top-[4%] w-[78%] aspect-square rounded-full border border-white/12"
        style={{ animation: "rtg-orbit-spin 28s linear infinite" }}
      >
        <span className="absolute top-[12%] right-[16%] w-3 h-3 rounded-full bg-rtg-orange-500 shadow-[0_0_14px_rgba(247,107,28,.7)]" />
      </div>
      <div
        className="absolute left-[30%] top-[18%] w-[48%] aspect-square rounded-full border border-rtg-orange-400/25"
        style={{ animation: "rtg-orbit-spin-reverse 19s linear infinite" }}
      >
        <span className="absolute -right-1 top-1/2 w-2 h-2 rounded-full bg-rtg-orange-400" />
      </div>

      <svg viewBox={SCENE_VIEWBOX} className="absolute inset-x-0 top-[4%] w-full h-[70%] overflow-visible" fill="none">
        {art.ovals?.map(([rx, ry]) => (
          <ellipse key={rx} cx="270" cy="218" rx={rx} ry={ry} stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
        ))}
        <path
          d={art.path}
          stroke="rgba(255,255,255,.4)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="rtg-route-dash"
        />
        {art.nodes?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={6 + (i % 3) * 2} fill="#ae7edf" className="rtg-pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
        {art.dots?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="7" fill="#ff7b2e" className="rtg-pulse-dot" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </svg>

      {/* Floating glass metric card */}
      <motion.div
        className="glass absolute left-0 bottom-0 w-[55%] rounded-2xl px-4 py-4 xl:px-5"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="block text-[8px] font-bold tracking-[0.18em] uppercase text-rtg-orange-400 mb-1.5">{card.kicker}</span>
        <strong className="block font-display font-normal text-2xl xl:text-3xl text-rtg-white leading-none">{card.heading}</strong>
        <div className="grid grid-flow-col auto-cols-fr gap-2 mt-3">
          {card.metrics.map((m) => (
            <span key={`${m.value}-${m.label}`} className="rounded-lg border border-white/15 bg-white/5 px-1.5 py-2 text-center leading-tight">
              <b className="block text-[11px] font-extrabold uppercase text-rtg-white">{m.value}</b>
              <span className="block text-[7px] font-semibold tracking-[0.08em] uppercase text-rtg-mist">{m.label}</span>
            </span>
          ))}
        </div>
      </motion.div>

      {icon && (
        <svg
          viewBox={icon.viewBox}
          className="absolute left-[62%] bottom-0 w-[24%] text-white/75"
          style={{ animation: icon.animation }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon.shape}
        </svg>
      )}
    </>
  );
}

// "Present Across India" marquee: a masked-edge window containing the
// state-chip list rendered TWICE back-to-back so a seamless
// `translateX(0 -> -50%)` loop never shows a seam, plus a static trailing
// pill outside the scrolling track. Reuses the shared `--animate-marquee`
// keyframe from index.css. Pauses on hover (desktop only — touch devices
// simply keep scrolling).
function PresenceMarquee({ states, label, expandingLabel }) {
  return (
    <div className="mt-6 md:mt-7 flex items-center gap-3 md:gap-4 max-w-full">
      <span className="hidden sm:inline-block shrink-0 text-[10px] font-black tracking-[0.16em] uppercase text-rtg-white/90">
        {label}
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
                  className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 ring-1 ring-white/10 text-white/80 text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                >
                  <span className="w-1 h-1 rounded-full bg-rtg-orange-400 shrink-0" />
                  {s}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="hidden sm:inline-block shrink-0 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-rtg-orange-400 bg-rtg-orange-500/15 ring-1 ring-rtg-orange-400/30 whitespace-nowrap">
        {expandingLabel}
      </span>
    </div>
  );
}

// Slide text enters as a short stagger (eyebrow -> headline lines ->
// paragraph) and leaves as one block.
const heroTextGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
  exit: { opacity: 0, y: -14, transition: { duration: 0.3, ease: "easeIn" } },
};
const heroTextItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: HERO_EASE } },
};

const MOBILE_FOCUS_CLASS = { top: "object-top", center: "object-center", bottom: "object-bottom" };

function Hero({ images, settings, slides }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const copy = useMemo(() => buildHeroCopy(settings), [settings]);
  const stats = useMemo(() => buildStats(settings), [settings]);
  const states = useMemo(() => pickStates(settings), [settings]);

  const [slide, setSlide] = useState(0);
  const total = slides.length;
  const current = slides[slide];

  const goTo = (i) => setSlide(((i % total) + total) % total);

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

  // `min-h` (not a fixed height) below — lets the section grow taller than
  // one viewport if the headline + bottom band (slide nav, stats, presence
  // marquee) need more room than the viewport offers, instead of clipping.
  return (
    <section ref={ref} className="theme-night relative min-h-[max(100svh,640px)] lg:min-h-[max(100svh,680px)] w-full overflow-hidden flex flex-col">
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
      {/* One uniform dark scrim across the whole photo — full-bleed photo,
          white H1 first line + gradient accent line, orange eyebrow. */}
      <div className="absolute inset-0 bg-gradient-to-t from-rtg-purple-950 via-rtg-purple-950/50 to-rtg-purple-950/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-rtg-purple-950/65 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,rgba(247,107,28,.16),transparent_32%)]" />

      {/* Slide timer — a hairline top-right that fills over one slide's
          duration, then restarts with the next. */}
      <div className="hidden lg:block absolute z-10 top-20 right-[4.7%] w-[220px] h-px bg-white/15">
        <motion.span
          key={slide}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-rtg-orange-400 to-rtg-purple-300"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: HERO_SLIDE_DURATION / 1000, ease: "linear" }}
        />
      </div>

      {/* Per-slide cinematic scene — orbit rings, sport-specific route/track
          line-art, a floating glass metric card and a line-art icon.
          Desktop only, so smaller screens stay focused on the headline. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          aria-hidden="true"
          className="hidden lg:block absolute z-[5] right-[2.4%] top-[24%] w-[min(34.5vw,660px)] aspect-[5/4] pointer-events-none"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: HERO_EASE }}
        >
          <HeroCinematicScene slide={current} index={slide} total={total} />
        </motion.div>
      </AnimatePresence>

      <motion.div
        style={{ opacity }}
        className="relative z-10 flex-1 flex flex-col w-full max-w-[1480px] mx-auto px-6 md:px-10 pt-24 md:pt-28 pb-5 md:pb-6"
      >
        <div className="flex-1 flex items-center py-6 lg:py-8">
          <div className="w-full lg:max-w-[56%]">
            <AnimatePresence mode="wait">
              <motion.div key={slide} variants={heroTextGroup} initial="hidden" animate="show" exit="exit">
                <motion.span
                  variants={heroTextItem}
                  className="block text-rtg-orange-400 font-bold tracking-[0.22em] uppercase text-[10px] md:text-[11px] mb-4 md:mb-5"
                >
                  {current.eyebrow}
                </motion.span>
                <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[clamp(4.25rem,5.6vw,6.75rem)] leading-[0.92] mb-5 md:mb-7">
                  <motion.span variants={heroTextItem} className="block">
                    {current.title}
                  </motion.span>
                  <motion.span variants={heroTextItem} className="block">
                    <span className="text-gradient">{current.accent}</span>
                  </motion.span>
                </h1>
                <motion.p variants={heroTextItem} className="text-white/80 text-sm md:text-base lg:text-[clamp(0.9rem,0.9vw,1.0625rem)] max-w-[36rem] leading-relaxed">
                  {current.subtitle}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-8 md:mt-10"
            >
              <Button to={copy.ctaLink} size="lg" className="uppercase !text-[11px] !font-extrabold !tracking-[0.18em] md:!px-12 md:!py-[1.05rem]">
                {copy.ctaLabel}
              </Button>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
        >
          {/* Slide navigation — arrows either side of the dots */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => goTo(slide - 1)}
              aria-label="Previous slide"
              className="w-11 h-11 rounded-full bg-white text-rtg-purple-950 shadow-lg flex items-center justify-center hover:bg-rtg-orange-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="relative flex items-center gap-2">
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 whitespace-nowrap text-[8px] font-bold tracking-[0.2em] uppercase text-white/60">
                {copy.scrollLabel}
              </span>
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === slide ? "w-7 bg-rtg-orange-500" : "w-1.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(slide + 1)}
              aria-label="Next slide"
              className="w-11 h-11 rounded-full bg-white text-rtg-purple-950 shadow-lg flex items-center justify-center hover:bg-rtg-orange-500 hover:text-white transition-colors"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Community numbers — same admin-editable stats as CommunityProof */}
          <div className="mt-7 md:mt-8 grid grid-cols-3 gap-y-5 lg:grid-cols-none lg:grid-flow-col lg:auto-cols-fr lg:divide-x lg:divide-white/10">
            {stats.map((s) => (
              <div key={s.key} className="px-2 text-center">
                <AnimatedCounter
                  value={s.value}
                  suffix={s.suffix}
                  className="block font-display text-3xl md:text-4xl lg:text-[clamp(2.1rem,2.55vw,3rem)] leading-none text-rtg-orange-500"
                />
                <span className="block mt-2 text-[8px] md:text-[9px] font-bold tracking-[0.14em] uppercase text-white/85">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <PresenceMarquee states={states} label={copy.presenceLabel} expandingLabel={copy.expandingLabel} />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const heroSlides = useMemo(() => buildHeroSlides(settings), [settings]);
  return (
    <>
      <Hero images={images} settings={settings} slides={heroSlides} />

      {/* WHY RTG + MORE WAYS TO MOVE — the two light sections directly
          under the hero. Neither paints a background: the fixed
          SiteBackground (see Layout) shows through both. */}
      <WhyRtg settings={settings} />
      <WaysToMove settings={settings} images={images} />

      {/* TRAINING FORMATS — dark, photo-backed showcase with tabs, then
          UPCOMING EVENTS — the featured events as large slides. */}
      <TrainingFormats images={images} />
      <UpcomingEvents settings={settings} images={images} />

      {/* MERCHANDISE HIGHLIGHTS — the store's products as a drifting row */}
      <MerchHighlights settings={settings} images={images} />

      {/* COMMUNITY GALLERY — sticky copy beside a scrolling photo grid, then
          WHAT PEOPLE SAY — the testimonials, one at a time. */}
      <GalleryShowcase settings={settings} />
      <CommunityVoices settings={settings} />
    </>
  );
}
