import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { rtgMoments, joinSteps, waysToParticipate } from "../data/content";
import { useTeamMembers, useWeeklySessions, useSiteImages } from "../lib/publicData";
import { useAuthGate } from "../lib/AuthGateContext";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import CommunityProof from "../components/sections/CommunityProof";
import {
  CalendarClock,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Bike,
  Footprints,
  Flame,
  Users,
  HeartHandshake,
} from "lucide-react";
import { InstagramIcon } from "../components/ui/SocialIcons";

const WAYS_ICONS = { bike: Bike, footprints: Footprints, flame: Flame, users: Users, "heart-handshake": HeartHandshake };

const scrollToJoin = () => {
  document.getElementById("join-rtg")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const scrollToVolunteer = (e) => {
  e.preventDefault();
  document.getElementById("volunteer")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

// Quiet orbit-ring accent — same inline-animation pattern used on Home/Events
// (three nested rings driven by the shared rtg-orbit-spin / -reverse / -pulse
// keyframes from index.css). Mirrors the reference's `hero-orbit-v2` /
// `rtg-way-orbit-v8` rings. Sized down and kept visible at every breakpoint
// (just smaller + lower-opacity on mobile) since the brief calls for motion
// to stay visible on small screens, not just desktop.
function OrbitAccent({ className = "" }) {
  return (
    <div
      className={`absolute z-0 w-[60vw] max-w-[320px] aspect-square pointer-events-none opacity-40 md:opacity-70 ${className}`}
    >
      <div className="absolute inset-0 rounded-full border border-rtg-orange-300/25" style={{ animation: "rtg-orbit-spin 22s linear infinite" }} />
      <div className="absolute inset-[14%] rounded-full border border-rtg-purple-300/25" style={{ animation: "rtg-orbit-spin-reverse 16s linear infinite" }} />
      <div className="absolute inset-[29%] rounded-full border border-rtg-orange-400/30" style={{ animation: "rtg-orbit-pulse 4.6s ease-in-out infinite" }} />
    </div>
  );
}

// Route-dash SVG accent — a dashed line "drawing" itself infinitely, plus a
// couple of pulsing dots. Echoes the reference's `hero-route-v2` /
// `rtg-way-line-v8` wandering path. Built entirely from the shared
// `.rtg-route-dash` / `.rtg-pulse-dot` classes already in index.css.
function RouteAccent({ className = "", dotClassName = "text-white/10" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 600 200" preserveAspectRatio="none" className={`absolute inset-0 w-full h-full ${dotClassName}`}>
        <path
          d="M-10 150 C120 60, 220 190, 340 90 S520 30, 620 110"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="rtg-route-dash"
        />
      </svg>
      <span className="rtg-pulse-dot absolute left-[12%] top-[38%] w-2 h-2 rounded-full bg-rtg-orange-500" />
      <span
        className="rtg-pulse-dot absolute right-[16%] top-[62%] w-2 h-2 rounded-full bg-rtg-purple-300"
        style={{ animationDelay: "1.1s" }}
      />
    </div>
  );
}

// Small "editorial number" kicker — mirrors Events.jsx's SectionIndex (big
// faint Bebas numeral + small label, divider rule), reused here so Community
// matches the same worked pattern instead of inventing a new one.
function SectionIndex({ n, label }) {
  return (
    <Reveal direction="left" className="flex items-end gap-5 pb-6 mb-10 border-b border-rtg-border">
      <span className="font-display text-[clamp(3rem,8vw,5rem)] leading-[0.75] text-rtg-orange-500/20 select-none">
        {n}
      </span>
      <span className="pb-1 text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-rtg-mist">
        {label}
      </span>
    </Reveal>
  );
}

// Horizontal sliding carousel of team-member cards — native scroll-snap
// (smooth, no janky custom state machine) plus a Framer Motion hover lift
// per card for the "good effects" feel.
function TeamVoicesSlider({ items }) {
  const scrollRef = useRef(null);
  const scrollByCards = (dir) => scrollRef.current?.scrollBy({ left: dir * 296, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((m) => (
          <div key={m.name} className="snap-center shrink-0 w-64">
            <GlassCard hover className="text-center h-full">
              <img
                src={m.image}
                alt={m.name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-rtg-orange-400/40"
              />
              <h3 className="font-display text-xl mb-0.5">{m.name}</h3>
              <p className="text-rtg-orange-400 text-sm font-semibold mb-3">{m.role}</p>
              {m.instagramUrl && (
                <a
                  href={m.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-rtg-mist hover:text-rtg-orange-400 transition-colors"
                >
                  <InstagramIcon size={12} /> Follow
                </a>
              )}
            </GlassCard>
          </div>
        ))}
      </div>
      {items.length > 3 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => scrollByCards(-1)}
            className="w-11 h-11 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
            aria-label="Previous team members"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scrollByCards(1)}
            className="w-11 h-11 rounded-full glass flex items-center justify-center hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
            aria-label="Next team members"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Community() {
  const images = useSiteImages();
  const teamMembers = useTeamMembers();
  const weeklySessions = useWeeklySessions();
  const { requestLogin } = useAuthGate();

  return (
    <>
      {/* 1. HERO — real people, immediate invitation */}
      <div className="relative">
        <PageHero
          image={images.communityHero}
          eyebrow="Who We Are"
          title="One Community. Every Journey."
          subtitle="Cyclists, runners, swimmers, beginners, and veterans — everyone belongs at RTG. Come as you are, leave with your people."
        />
        {/* Orbit + route motion lifted straight from the reference's
            hero-motion-v2 — kept outside PageHero (untouched file) as a
            sibling overlay instead. */}
        <OrbitAccent className="top-[8%] right-[4%] md:top-[10%] md:right-[8%]" />
        <RouteAccent className="hidden sm:block" dotClassName="text-white/15" />
      </div>
      <div className="relative -mt-10 md:-mt-14 z-10 flex justify-center pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button onClick={scrollToJoin} size="lg" icon={ArrowRight}>Join RTG</Button>
        </motion.div>
      </div>

      {/* 2. COMMUNITY PROOF — same live numbers as the homepage */}
      <CommunityProof light />

      {/* 3. WHAT RTG FEELS LIKE — four-moment collage */}
      <Section
        contentKey="community.feelsLike"
        light
        eyebrow="What RTG Feels Like"
        title="Come for the Activity. Stay for the People."
        subtitle="It's never just a ride or a run — it's the whole moment around it."
        className="relative"
      >
        <SectionIndex n="01" label="The RTG Way" />
        <StaggerGroup className="grid sm:grid-cols-2 gap-6">
          {rtgMoments.map((m) => (
            <StaggerItem key={m.title}>
              <GlassCard className="p-0 overflow-hidden h-full group" hover>
                <div className="h-56 overflow-hidden">
                  <img
                    src={images[m.key]}
                    alt={m.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{m.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed">{m.desc}</p>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* 4. WAY TO BE PART OF RTG — the join roadmap, relocated from its old spot near the top */}
      <Section
        id="join-rtg"
        contentKey="community.howToJoin"
        dark
        eyebrow="Getting Started"
        title="Way to Be Part of RTG"
        subtitle="Seven steps from stranger to teammate."
        className="relative"
      >
        <RouteAccent dotClassName="text-white/10" />
        <div className="relative z-10">
          <SectionIndex n="02" label="Stranger to Teammate" />
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            {joinSteps.map((s) => (
              <StaggerItem key={s.step}>
                <GlassCard className="h-full">
                  <span className="font-display text-4xl text-rtg-orange-400/60 block mb-3">
                    {String(s.step).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-xl mb-2">{s.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed">{s.desc}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal className="text-center mb-10">
            <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs md:text-sm mb-3">
              Pick Your Entry Point
            </span>
            <h3 className="font-display text-2xl md:text-3xl">Ways to Participate</h3>
          </Reveal>
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {waysToParticipate.map((w) => {
              const Icon = WAYS_ICONS[w.icon];
              const isAnchor = w.to.startsWith("#");
              const card = (
                <GlassCard hover className="h-full text-center">
                  <Icon className="text-rtg-orange-400 mx-auto mb-3" size={26} />
                  <h4 className="font-display text-lg mb-1.5">{w.title}</h4>
                  <p className="text-rtg-mist text-xs leading-relaxed">{w.desc}</p>
                </GlassCard>
              );
              return (
                <StaggerItem key={w.title}>
                  {isAnchor ? (
                    <a href={w.to} onClick={scrollToVolunteer} className="block h-full">{card}</a>
                  ) : (
                    <Link to={w.to} className="block h-full">{card}</Link>
                  )}
                </StaggerItem>
              );
            })}
          </StaggerGroup>

          <Reveal className="text-center">
            <Button onClick={() => requestLogin("signup")} size="lg">Get Started</Button>
          </Reveal>
        </div>
      </Section>

      {/* 5. UPCOMING COMMUNITY EXPERIENCES — weekly rhythm + a direct link to the calendar */}
      <Section
        contentKey="community.upcoming"
        light
        eyebrow="Don't Miss Out"
        title="Upcoming Community Experiences"
        subtitle="Our weekly rhythm — full calendar has everything else, races included."
        className="relative"
      >
        <SectionIndex n="03" label="Mark Your Calendar" />
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {weeklySessions.slice(0, 4).map((s) => (
            <StaggerItem key={s.slug || s.name}>
              <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="h-full">
                <GlassCard className="h-full text-center flex flex-col">
                  <span className="text-rtg-orange-400 font-display text-lg tracking-wide flex items-center justify-center gap-2">
                    <CalendarClock size={16} /> {s.day}
                  </span>
                  <h3 className="font-display text-xl my-2">{s.name}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed flex-1">{s.format || s.description}</p>
                </GlassCard>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <Reveal className="text-center">
          <Button to="/race-calendar" variant="outline" size="lg" icon={ArrowRight}>View Full Calendar</Button>
        </Reveal>
      </Section>

      {/* 6. MEMBER VOICES — hidden for now per request. Sliding carousel,
          editable per-person via the admin Team screen; re-add the
          <Section>/<TeamVoicesSlider> block below when ready.
      <Section contentKey="community.voices" light eyebrow="Member Voices" title="The People Behind RTG">
        <TeamVoicesSlider items={teamMembers} />
      </Section>
      */}

      {/* 7. VOLUNTEER — LAUNCHING SOON */}
      <Section id="volunteer" contentKey="community.volunteer" light eyebrow="Get Involved" title="Volunteer With RTG" className="relative overflow-hidden">
        <OrbitAccent className="hidden md:block top-[-6%] left-[-4%] opacity-30" />
        <Reveal className="relative z-10">
          <GlassCard className="max-w-xl mx-auto text-center py-14">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block"
            >
              <Sparkles className="text-rtg-orange-400 mx-auto mb-4" size={32} />
            </motion.div>
            <h3 className="font-display text-2xl mb-2">Launching Soon</h3>
            <p className="text-rtg-mist text-sm leading-relaxed max-w-sm mx-auto">
              We're building a proper volunteer program — marshalling, event logistics, photography, and more.
              Check back soon, or reach out if you can't wait.
            </p>
          </GlassCard>
        </Reveal>
      </Section>

      {/* 8. FINAL CTA */}
    </>
  );
}
