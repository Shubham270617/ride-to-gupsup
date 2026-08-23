import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { stats, whyJoin, heroSlides } from "../data/content";
import { useEvents, useProducts, useTestimonials, useGalleryItems, useSponsors, useSiteImages, useSiteSettings, pickText, useWeeklySessions, useCities } from "../lib/publicData";
import Section from "../components/ui/Section";
import Button from "../components/ui/Button";
import GlassCard from "../components/ui/GlassCard";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import EventCard from "../components/ui/EventCard";
import ProductCard from "../components/ui/ProductCard";
import MasonryGallery from "../components/ui/MasonryGallery";
import RotatingPhotoWheel from "../components/ui/RotatingPhotoWheel";
import TestimonialSlider from "../components/ui/TestimonialSlider";
import Newsletter from "../components/sections/Newsletter";
import JoinCTA from "../components/sections/JoinCTA";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import useIsMobile from "../hooks/useIsMobile";

const HeroScene = lazy(() => import("../three/HeroScene"));

const HERO_SLIDE_DURATION = 6000;

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

  // Auto-advance — the effect re-runs (and so the timer restarts) whenever
  // `slide` changes, whether that change came from the timer itself or a
  // manual arrow click, so manually navigating never gets immediately
  // undone by an auto-advance a moment later.
  useEffect(() => {
    const t = setTimeout(() => goTo(slide + 1), HERO_SLIDE_DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  return (
    <section ref={ref} className="relative h-svh min-h-[640px] w-full overflow-hidden flex items-end">
      <motion.div style={{ y }} className="absolute inset-0 scale-110">
        <AnimatePresence mode="sync">
          <motion.img
            key={slide}
            src={images[current.imageKey]}
            alt={current.tag}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-rtg-ink via-rtg-ink/50 to-rtg-purple-950/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-rtg-purple-950/60 via-transparent to-transparent" />

      {!isMobile && (
        <div className="absolute inset-0 z-[5] mix-blend-screen opacity-80">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>
      )}

      <motion.div style={{ opacity }} className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-16 md:pb-24 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hidden sm:block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
              {current.tag} · Community · Adventure
            </span>
            <h1 className="font-display text-6xl sm:text-7xl md:text-9xl leading-[0.9] mb-6 max-w-5xl">
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
          <Button to="/community" size="lg" icon={ArrowUpRight}>Join Community</Button>
          <Button to="/events" variant="secondary" size="lg" icon={ArrowDown}>Explore Events</Button>
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
                      className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-rtg-orange-400 to-rtg-purple-400"
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
      </motion.div>

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

const GALLERY_PREVIEW_CATEGORIES = ["All", "Cycling", "Running", "Swimming", "Events", "Volunteers", "Videos"];

export default function Home() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const t = (key, fallback) => pickText(settings, key, fallback);
  const cities = useCities();
  const events = useEvents();
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

      {/* ABOUT RTG */}
      <Section center={false} light>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="right">
            <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
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

      {/* WHY JOIN */}
      <Section contentKey="home.whyJoin" eyebrow="Why RTG" title="Why Athletes Join RTG" subtitle="Six reasons endurance athletes across India call RTG home." dark>
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {whyJoin.map((w) => (
            <StaggerItem key={w.title}>
              <GlassCard className="h-full">
                <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{w.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{w.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* STATS / 500+ MEMBERS + PRESENCE */}
      <Section light>
        <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mb-16">
          {stats.map((s) => {
            const value = Number(t(`text.home.stat.${s.key}`, String(s.value))) || 0;
            return (
              <StaggerItem key={s.label}>
                <div className="text-center">
                  <AnimatedCounter value={value} suffix={s.suffix} className="font-display text-4xl md:text-6xl text-gradient block" />
                  <p className="text-rtg-mist text-xs md:text-sm mt-2 tracking-wide uppercase">{s.label}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        <Reveal className="text-center">
          <h3 className="font-display text-2xl md:text-4xl mb-6">Present Across India</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {cities.map((c) => (
              <span key={c} className="glass px-5 py-2.5 rounded-full text-sm font-medium text-rtg-white/90 flex items-center gap-2">
                <MapPin size={14} className="text-rtg-orange-400" /> {c}
              </span>
            ))}
            <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-rtg-orange-400 border-2 border-dashed border-rtg-orange-400/40">
              + Expanding
            </span>
          </div>
        </Reveal>
      </Section>

      {/* WEEKLY ACTIVITIES */}
      <Section contentKey="home.weeklyActivities" eyebrow="Weekly Rhythm" title="Weekly Activities" subtitle="Consistency builds champions. Here's how our week looks." dark>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {weeklySessions.slice(0, 4).map((s) => (
            <Reveal key={s.slug || s.name}>
              <GlassCard className="h-full text-center flex flex-col">
                <span className="text-rtg-orange-400 font-display text-xl tracking-wide">{s.day}</span>
                <h3 className="font-display text-2xl my-3">{s.name}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed flex-1 mb-5">{s.format || s.description}</p>
                <Button to={s.slug ? `/weekly-rides/${s.slug}` : "/weekly-rides"} variant="outline">
                  View Details
                </Button>
              </GlassCard>
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <Button to="/weekly-rides" variant="outline">See Full Weekly Schedule</Button>
        </div>
      </Section>

      {/* UPCOMING EVENTS */}
      <Section contentKey="home.upcomingEvents" eyebrow="Don't Miss Out" title="Upcoming Events" light>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Reveal className="md:col-span-2">
            <EventCard event={events[0]} featured />
          </Reveal>
          {events.slice(1, 3).map((e) => (
            <Reveal key={e.id}>
              <EventCard event={e} />
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <Button to="/events" variant="outline">View All Events</Button>
        </div>
      </Section>

      {/* GALLERY PREVIEW */}
      <Section contentKey="home.gallery" eyebrow="Moments" title="Community Gallery" subtitle="Finish lines, sunrise starts, and everything in between." dark>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {GALLERY_PREVIEW_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setGalleryFilter(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                galleryFilter === c ? "bg-rtg-orange-500 text-rtg-ink" : "glass text-rtg-white/75 hover:text-rtg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {filteredGallery.length === 0 ? (
          <p className="text-center text-rtg-mist py-10">No {galleryFilter.toLowerCase()} moments yet — check back soon.</p>
        ) : (
          <MasonryGallery items={filteredGallery.slice(0, 8)} />
        )}
        <div className="text-center mt-10">
          <Button to="/gallery" variant="outline">View Full Gallery</Button>
        </div>
      </Section>

      {/* MERCH PREVIEW */}
      <Section contentKey="home.store" eyebrow="RTG Store" title="Gear Up Like a Pro" light>
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

      {/* TESTIMONIALS — Sponsors right above only renders once a real
          sponsor exists, so this flips dark/light to match whichever
          section actually ended up before it, keeping the alternation
          correct either way instead of assuming Sponsors is always there. */}
      <Section
        contentKey="home.testimonials"
        eyebrow="Athlete Voices"
        title="What Our Community Says"
        light={sponsors.length > 0}
        dark={sponsors.length === 0}
      >
        <TestimonialSlider items={testimonials} />
      </Section>

      <Newsletter dark={sponsors.length > 0} />
      {/* Instagram feed hidden for now, per request — planned for next sprint. Re-add <InstagramFeed /> here when ready. */}
      <JoinCTA />
    </>
  );
}
