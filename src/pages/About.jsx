import { Target, Eye, Bike, Footprints, Trophy, Flag, Mountain, Coffee, ArrowRight } from "lucide-react";
import {
  coreValues,
  howItStarted,
  whyRtgExists,
  communityPillars,
  rtgJourney,
  rtgInMotion,
  roadAheadFlow,
} from "../data/content";
import { useTeamMembers, useSiteImages, useSiteSettings, pickText } from "../lib/publicData";
import { InstagramIcon } from "../components/ui/SocialIcons";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

const PILLAR_ICONS = { bike: Bike, footprints: Footprints, trophy: Trophy, flag: Flag, mountain: Mountain, coffee: Coffee };

export default function About() {
  const images = useSiteImages();
  const teamMembers = useTeamMembers();
  const settings = useSiteSettings();
  const t = (key, fallback) => pickText(settings, key, fallback);

  return (
    <>
      <PageHero
        image={images.aboutHero}
        eyebrow="Our Story"
        title="More Than Sport. A Community."
        subtitle="RideTeaGupShup brings cyclists, runners and endurance enthusiasts together to move, connect, learn and create experiences worth remembering."
      />

      {/* HOW IT STARTED */}
      <Section contentKey="about.howItStarted" light eyebrow="Our Origin" title="How It Started" center={false}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="right">
            <p className="text-rtg-mist text-lg leading-relaxed mb-6">
              {t("text.about.howItStarted.p1", howItStarted[0])}
            </p>
            <p className="text-rtg-mist text-lg leading-relaxed">
              {t("text.about.howItStarted.p2", howItStarted[1])}
            </p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <div className="rounded-3xl overflow-hidden">
              <img src={images.aboutStory1} alt="RTG founding story" className="w-full aspect-[4/5] object-cover" />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* WHY RTG EXISTS */}
      <Section contentKey="about.whyExists" light eyebrow="Why We're Here" title="Why RTG Exists">
        <StaggerGroup className="grid sm:grid-cols-3 gap-6">
          {whyRtgExists.map((w) => (
            <StaggerItem key={w.title}>
              <GlassCard className="h-full">
                <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{w.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{w.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* THE RTG JOURNEY — horizontal on desktop, vertical on mobile */}
      <Section contentKey="about.journey" light eyebrow="How Far We've Come" title="The RTG Journey">
        {/* Desktop: horizontal */}
        <div className="hidden md:block relative">
          <div className="absolute top-[7px] left-0 right-0 h-px bg-white/10" />
          <div className="flex items-start justify-between gap-4">
            {rtgJourney.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} className="relative flex-1 text-center px-2">
                <span className="relative z-10 mx-auto block w-3.5 h-3.5 rounded-full bg-rtg-orange-500 ring-4 ring-rtg-orange-500/20 mb-4" />
                {s.date && (
                  <p className="text-xs text-rtg-orange-400 font-semibold uppercase tracking-wide mb-1">{s.date}</p>
                )}
                <h3 className="font-display text-base mb-1.5 leading-tight">{s.label}</h3>
                {s.desc && <p className="text-rtg-mist text-xs leading-relaxed">{s.desc}</p>}
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden max-w-2xl mx-auto">
          {rtgJourney.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06} className="flex gap-5 pb-10 last:pb-0">
              <div className="flex flex-col items-center shrink-0">
                <span className="w-3.5 h-3.5 rounded-full bg-rtg-orange-500 ring-4 ring-rtg-orange-500/20" />
                {i < rtgJourney.length - 1 && <span className="w-px flex-1 bg-white/10 mt-1" />}
              </div>
              <div>
                {s.date && <p className="text-xs text-rtg-orange-400 font-semibold uppercase tracking-wide mb-1">{s.date}</p>}
                <h3 className="font-display text-xl mb-1">{s.label}</h3>
                {s.desc && <p className="text-rtg-mist text-sm leading-relaxed">{s.desc}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* MISSION & VISION */}
      <Section contentKey="about.missionVision" light eyebrow="What Drives Us" title="Mission & Vision">
        <div className="grid md:grid-cols-2 gap-6">
          <Reveal>
            <GlassCard className="h-full">
              <Target className="text-rtg-orange-400 mb-4" size={36} />
              <h3 className="font-display text-3xl mb-3">Mission</h3>
              <p className="text-rtg-mist leading-relaxed">
                {t("text.about.mission", "Build an inclusive endurance community where people connect through sport, learn from one another, challenge themselves and create experiences that go beyond the finish line.")}
              </p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="h-full">
              <Eye className="text-rtg-orange-400 mb-4" size={36} />
              <h3 className="font-display text-3xl mb-3">Vision</h3>
              <p className="text-rtg-mist leading-relaxed">
                {t("text.about.vision", "Build one of India's most trusted endurance communities — connecting cycling, running, triathlon and outdoor adventure through community, events, training and technology.")}
              </p>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      {/* HOW WE BRING THE COMMUNITY TOGETHER */}
      <Section contentKey="about.howWeBring" light eyebrow="What We Offer" title="How We Bring the Community Together">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {communityPillars.map((p) => {
            const Icon = PILLAR_ICONS[p.icon];
            return (
              <StaggerItem key={p.title}>
                <GlassCard className="h-full">
                  <Icon className="text-rtg-orange-400 mb-3" size={28} />
                  <h3 className="font-display text-xl mb-2">{p.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed">{p.desc}</p>
                </GlassCard>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </Section>

      {/* CORE VALUES */}
      <Section contentKey="about.coreValues" light eyebrow="What We Stand For" title="Our Core Values">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreValues.map((v) => (
            <StaggerItem key={v.title}>
              <GlassCard className="h-full">
                <h3 className="font-display text-xl mb-2 text-rtg-orange-400">{v.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{v.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* RTG IN MOTION */}
      <Section contentKey="about.motion" light eyebrow="RTG in Motion" title="Where We Stand Today">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rtgInMotion.map((m) => (
            <StaggerItem key={m.key}>
              <div className="text-center">
                <p className="font-display text-3xl md:text-4xl text-gradient mb-2">
                  {t(`text.about.motion.${m.key}`, m.value)}
                </p>
                {m.label && <p className="text-rtg-mist text-xs md:text-sm tracking-wide uppercase">{m.label}</p>}
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* OUR LEADERSHIP */}
      <Section contentKey="about.leadership" light eyebrow="The People Behind RTG" title="Our Leadership">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((m) => (
            <StaggerItem key={m.name}>
              <GlassCard className="text-center h-full">
                <img
                  src={m.image}
                  alt={m.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-rtg-orange-400"
                />
                <h3 className="font-display text-xl mb-1">{m.name}</h3>
                <p className="text-rtg-orange-400 text-sm font-semibold mb-3">{m.role}</p>
                <p className="text-rtg-mist text-xs mb-4">{[m.city, m.sport].filter(Boolean).join(" · ")}</p>
                {m.instagramUrl && (
                  <a
                    href={m.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-rtg-mist hover:text-rtg-orange-400 transition-colors"
                  >
                    <InstagramIcon size={13} /> Follow
                  </a>
                )}
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* THE ROAD AHEAD */}
      <Section contentKey="about.roadAhead" light eyebrow="What's Coming" title="The Road Ahead">
        <Reveal className="text-center mb-12">
          <p className="text-rtg-mist text-lg leading-relaxed max-w-2xl mx-auto">
            {t(
              "text.about.roadAhead",
              "We're building RTG step by step — stronger local communities, better events, meaningful challenges, structured training opportunities, memorable endurance experiences and a digital ecosystem that keeps everything connected."
            )}
          </p>
        </Reveal>
        <Reveal className="flex flex-wrap items-center justify-center gap-3">
          {roadAheadFlow.map((step, i) => (
            <span key={step} className="flex items-center gap-3">
              <span className="glass px-5 py-2.5 rounded-full text-sm font-semibold text-rtg-white/90">{step}</span>
              {i < roadAheadFlow.length - 1 && <ArrowRight size={16} className="text-rtg-orange-400/60 shrink-0" />}
            </span>
          ))}
        </Reveal>
      </Section>

      <JoinCTA />
    </>
  );
}
