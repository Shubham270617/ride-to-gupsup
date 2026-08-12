import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { images } from "../data/images";
import { brand, stats, whyJoin, weeklyActivities, heroSlides } from "../data/content";
import { useEvents, useProducts, useTestimonials, useGalleryItems } from "../lib/publicData";
import Section from "../components/ui/Section";
import Button from "../components/ui/Button";
import GlassCard from "../components/ui/GlassCard";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import EventCard from "../components/ui/EventCard";
import ProductCard from "../components/ui/ProductCard";
import MasonryGallery from "../components/ui/MasonryGallery";
import TestimonialSlider from "../components/ui/TestimonialSlider";
import Newsletter from "../components/sections/Newsletter";
import InstagramFeed from "../components/sections/InstagramFeed";
import JoinCTA from "../components/sections/JoinCTA";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import useIsMobile from "../hooks/useIsMobile";

const HeroScene = lazy(() => import("../three/HeroScene"));

const HERO_SLIDE_DURATION = 6000;

function Hero() {
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
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-rtg-orange-300 mb-6"
        >
          <MapPin size={14} /> {brand.members} Athletes · 8+ Indian Cities
        </motion.span>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 flex-1 max-w-2xl">
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

export default function Home() {
  const events = useEvents();
  const products = useProducts();
  const testimonials = useTestimonials();
  const galleryItems = useGalleryItems();
  return (
    <>
      <Hero />

      {/* ABOUT RTG */}
      <Section eyebrow="About RTG" title="More Than a Club. A Movement." center={false}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="right">
            <div className="rounded-3xl overflow-hidden">
              <img src={images.homeAbout} alt="RTG community riding together" className="w-full h-full object-cover aspect-[4/5]" />
            </div>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <p className="text-rtg-mist text-lg leading-relaxed mb-6">
              Ride Tea GupShup is more than a sports club — it's a growing movement that brings together
              cyclists, runners, swimmers, triathletes, and outdoor enthusiasts from across India. RTG was
              created to solve the lack of motivation, guidance, and community in endurance sports.
            </p>
            <p className="text-rtg-mist text-lg leading-relaxed mb-8">
              Our goal is to make sports fun, welcoming, educational, and rewarding for everyone — from
              beginners to experienced athletes. Everyone is welcome, regardless of age or fitness level.
            </p>
            <Button to="/about" variant="outline">Our Full Story</Button>
          </Reveal>
        </div>
      </Section>

      {/* WHY JOIN */}
      <Section eyebrow="Why RTG" title="Why Athletes Join RTG" subtitle="Six reasons endurance athletes across India call RTG home." dark>
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
      <section className="py-20 md:py-28 px-6 md:px-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mb-16">
            {stats.map((s) => (
              <StaggerItem key={s.label}>
                <div className="text-center">
                  <AnimatedCounter value={s.value} suffix={s.suffix} className="font-display text-4xl md:text-6xl text-gradient block" />
                  <p className="text-rtg-mist text-xs md:text-sm mt-2 tracking-wide uppercase">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal className="text-center">
            <h3 className="font-display text-2xl md:text-4xl mb-6">Present Across India</h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {brand.cities.map((c) => (
                <span key={c} className="glass px-5 py-2.5 rounded-full text-sm font-medium text-rtg-white/90 flex items-center gap-2">
                  <MapPin size={14} className="text-rtg-orange-400" /> {c}
                </span>
              ))}
              <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-rtg-orange-400 border-2 border-dashed border-rtg-orange-400/40">
                + Expanding
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WEEKLY ACTIVITIES */}
      <Section eyebrow="Weekly Rhythm" title="Weekly Activities" subtitle="Consistency builds champions. Here's how our week looks.">
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {weeklyActivities.map((a) => (
            <Reveal key={a.name}>
              <GlassCard className="h-full text-center">
                <span className="text-rtg-orange-400 font-display text-xl tracking-wide">{a.day}</span>
                <h3 className="font-display text-3xl my-3">{a.name}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{a.detail}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <Button to="/weekly-rides" variant="outline">See Friday Bricks Details</Button>
        </div>
      </Section>

      {/* UPCOMING EVENTS */}
      <Section eyebrow="Don't Miss Out" title="Upcoming Events" dark>
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
      <Section eyebrow="Moments" title="Community Gallery" subtitle="Finish lines, sunrise starts, and everything in between.">
        <MasonryGallery items={galleryItems.slice(0, 8)} />
        <div className="text-center mt-10">
          <Button to="/gallery" variant="outline">View Full Gallery</Button>
        </div>
      </Section>

      {/* MERCH PREVIEW */}
      <Section eyebrow="RTG Store" title="Gear Up Like a Pro" dark>
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
      <Section eyebrow="Trusted By" title="Our Sponsors & Partners" subtitle="Brands that fuel the RTG movement.">
        <StaggerGroup className="flex flex-wrap items-center justify-center gap-6">
          {["Endurance Fuel Co.", "TrailTech Bikes", "Hydra Sports", "PulseWear", "SummitGear"].map((n) => (
            <StaggerItem key={n}>
              <div className="glass px-8 py-6 rounded-2xl text-rtg-white/60 font-display text-xl tracking-wide hover:text-rtg-orange-400 transition-colors">
                {n}
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <div className="text-center mt-10">
          <Button to="/sponsors" variant="outline">Become a Sponsor</Button>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section eyebrow="Athlete Voices" title="What Our Community Says" dark>
        <TestimonialSlider items={testimonials} />
      </Section>

      <Newsletter />
      <InstagramFeed />
      <JoinCTA />
    </>
  );
}
