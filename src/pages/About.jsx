import { Target, Eye, Flag } from "lucide-react";
import { images } from "../data/images";
import { mission, vision, coreValues, fiveYearGoal } from "../data/content";
import { useTeamMembers } from "../lib/publicData";
import { InstagramIcon } from "../components/ui/SocialIcons";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function About() {
  const teamMembers = useTeamMembers();
  return (
    <>
      <PageHero
        image={images.aboutHero}
        eyebrow="Our Story"
        title="Built by Athletes, For Athletes"
        subtitle="The story of how a small group of friends turned early morning chai stops into India's fastest-growing endurance community."
      />

      <Section title="Why RTG Exists" center={false}>
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <Reveal direction="right">
            <p className="text-rtg-mist text-lg leading-relaxed mb-6">
              Ride Tea GupShup began with a simple observation: endurance sports in India were full of
              talented, motivated people who had nowhere to learn, train, and grow together. Cyclists rode
              alone. Runners trained without guidance. Beginners felt intimidated before they even started.
            </p>
            <p className="text-rtg-mist text-lg leading-relaxed">
              We built RTG to fix that — a fun, welcoming sports community where people of every level learn,
              improve, and enjoy endurance sports together. No egos, no pace-shaming, just chai, community,
              and the shared pursuit of going further than we thought possible.
            </p>
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <div className="rounded-3xl overflow-hidden">
              <img src={images.aboutStory1} alt="RTG founding story" className="w-full aspect-[4/5] object-cover" />
            </div>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal direction="right" className="order-2 md:order-1">
            <div className="rounded-3xl overflow-hidden">
              <img src={images.aboutStory2} alt="RTG community growth" className="w-full aspect-[4/5] object-cover" />
            </div>
          </Reveal>
          <Reveal direction="left" delay={0.1} className="order-1 md:order-2">
            <p className="text-rtg-mist text-lg leading-relaxed mb-6">
              What started as a handful of Friday morning rides at Nehru Park has grown into a movement of
              500+ athletes across 8+ Indian cities — cyclists, runners, swimmers, and triathletes united by
              one belief: sport is better shared.
            </p>
            <p className="text-rtg-mist text-lg leading-relaxed">
              Today, RTG runs weekly training sessions, community challenges, and marquee events like the
              Endurance League — all built on the same founding principle of making endurance sport
              accessible, educational, and genuinely fun.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section dark eyebrow="What Drives Us" title="Mission & Vision">
        <div className="grid md:grid-cols-2 gap-6">
          <Reveal>
            <GlassCard className="h-full">
              <Target className="text-rtg-orange-400 mb-4" size={36} />
              <h3 className="font-display text-3xl mb-3">Mission</h3>
              <p className="text-rtg-mist leading-relaxed">{mission}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="h-full">
              <Eye className="text-rtg-orange-400 mb-4" size={36} />
              <h3 className="font-display text-3xl mb-3">Vision</h3>
              <p className="text-rtg-mist leading-relaxed">{vision}</p>
            </GlassCard>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mt-6">
          <GlassCard>
            <Flag className="text-rtg-orange-400 mb-4" size={36} />
            <h3 className="font-display text-3xl mb-3">Our 5-Year Goal</h3>
            <p className="text-rtg-mist leading-relaxed max-w-3xl">{fiveYearGoal}</p>
          </GlassCard>
        </Reveal>
      </Section>

      <Section eyebrow="What We Stand For" title="Our Core Values">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      <Section dark eyebrow="The People Behind RTG" title="Our Leadership">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((t) => (
            <StaggerItem key={t.name}>
              <GlassCard className="text-center h-full">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-rtg-orange-400"
                />
                <h3 className="font-display text-xl mb-1">{t.name}</h3>
                <p className="text-rtg-orange-400 text-sm font-semibold mb-3">{t.role}</p>
                <p className="text-rtg-mist text-xs mb-4">
                  {[t.city, t.sport].filter(Boolean).join(" · ")}
                </p>
                {t.instagramUrl && (
                  <a
                    href={t.instagramUrl}
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

      <JoinCTA />
    </>
  );
}
