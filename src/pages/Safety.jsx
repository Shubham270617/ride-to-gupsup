import { ShieldCheck } from "lucide-react";
import { images } from "../data/images";
import { generalSafety, rideSafety } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function Safety() {
  return (
    <>
      <PageHero
        image={images.safetyHero}
        eyebrow="Ride & Run Prepared"
        title="Safety at RTG"
        subtitle="Endurance sport should push your limits, not your luck. Here's how we keep every session safe."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section eyebrow="Every Session, Every Time" title="General Safety Guidelines">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {generalSafety.map((s) => (
            <StaggerItem key={s.title}>
              <GlassCard className="h-full">
                <ShieldCheck className="text-rtg-orange-400 mb-3" size={26} />
                <h3 className="font-display text-xl mb-2">{s.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{s.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section dark eyebrow="Friday Bricks" title="Weekly Session Checklist">
        <Reveal className="max-w-2xl mx-auto">
          <ul className="space-y-3">
            {rideSafety.map((item) => (
              <li key={item} className="flex items-start gap-3 text-rtg-mist">
                <ShieldCheck className="text-rtg-orange-400 shrink-0 mt-0.5" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <JoinCTA />
    </>
  );
}
