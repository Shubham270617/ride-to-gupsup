import { images } from "../data/images";
import { sponsorOpportunities } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import { FileDown } from "lucide-react";

export default function Sponsors() {
  return (
    <>
      <PageHero
        image={images.sponsorsHero}
        eyebrow="Partner With RTG"
        title="Power the Movement"
        subtitle="Reach 500+ engaged endurance athletes across India through events, merchandise, and digital campaigns."
      />

      <Section eyebrow="Sponsorship Opportunities" title="Ways to Partner">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {sponsorOpportunities.map((s) => (
            <StaggerItem key={s.title}>
              <GlassCard className="h-full">
                <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{s.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{s.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="glass rounded-3xl p-10 md:p-16 text-center max-w-3xl mx-auto">
          <h3 className="font-display text-3xl md:text-4xl mb-4">Ready to Partner With RTG?</h3>
          <p className="text-rtg-mist mb-8 max-w-xl mx-auto">
            Request our sponsor deck for audience data, past activations, and partnership packages.
          </p>
          <Button to="/contact" size="lg" icon={FileDown}>Request Sponsor Deck</Button>
        </Reveal>
      </Section>
    </>
  );
}
