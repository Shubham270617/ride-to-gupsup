import { Flame } from "lucide-react";
import { images } from "../data/images";
import { useChallenges } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function Challenges() {
  const challenges = useChallenges();
  return (
    <>
      <PageHero
        image={images.challengesHero}
        eyebrow="Push Your Limits"
        title="Community Challenges"
        subtitle="Distance goals, elevation battles, and streaks that keep you accountable — with the whole community cheering you on."
      />

      <Section eyebrow="Live & Upcoming" title="Current Challenges">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <StaggerItem key={c.title}>
              <GlassCard className="h-full">
                <Flame className="text-rtg-orange-400 mb-4" size={30} />
                <span className="text-xs uppercase tracking-widest text-rtg-mist">{c.period}</span>
                <h3 className="font-display text-2xl my-2">{c.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{c.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <JoinCTA />
    </>
  );
}
