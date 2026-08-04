import { MapPin, Clock, Bike, CheckCircle2 } from "lucide-react";
import { images } from "../data/images";
import { rideSafety, whatToBring, rideFaqs } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import FAQAccordion from "../components/ui/FAQAccordion";
import Button from "../components/ui/Button";

const infoCards = [
  { icon: MapPin, label: "Location", value: "Nehru Park, Delhi" },
  { icon: Clock, label: "Time", value: "5:00 AM – 5:30 AM" },
  { icon: Bike, label: "Format", value: "30km Cycling + 5km Run" },
];

export default function WeeklyRides() {
  return (
    <>
      <PageHero
        image={images.ridesHero}
        eyebrow="Signature Session"
        title="Friday Bricks"
        subtitle="Our flagship weekly session — brick training that builds real endurance, every Friday before sunrise."
      />

      <Section center={false}>
        <StaggerGroup className="grid sm:grid-cols-3 gap-6 mb-16">
          {infoCards.map((c) => (
            <StaggerItem key={c.label}>
              <GlassCard className="text-center h-full">
                <c.icon className="text-rtg-orange-400 mx-auto mb-3" size={32} />
                <p className="text-xs uppercase tracking-widest text-rtg-mist mb-1">{c.label}</p>
                <p className="font-display text-2xl">{c.value}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-8">
          <Reveal direction="right">
            <img src={images.ridesBricks} alt="Friday Bricks session" className="w-full rounded-3xl aspect-[4/3] object-cover" />
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <h2 className="font-display text-4xl mb-4">Beginner Friendly. Seriously.</h2>
            <p className="text-rtg-mist text-lg leading-relaxed mb-4">
              "Brick training" — cycling straight into a run — is one of the most effective ways to build
              multi-sport endurance. Every Friday, RTG athletes meet at Nehru Park before sunrise for 30km of
              cycling followed immediately by a 5km run.
            </p>
            <p className="text-rtg-mist text-lg leading-relaxed mb-8">
              Whether you're training for your first triathlon or you're a seasoned athlete chasing a new
              personal best, the group regroups often and rides/runs at a pace that includes everyone.
            </p>
            <Button href="https://strava.com/clubs/RideTeaGupShup" size="lg">Join This Ride</Button>
          </Reveal>
        </div>
      </Section>

      <Section dark eyebrow="Ride Prepared" title="Safety Guidelines">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 max-w-4xl mx-auto">
          {rideSafety.map((s) => (
            <Reveal key={s} className="flex items-start gap-3">
              <CheckCircle2 className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
              <p className="text-rtg-mist">{s}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="Pack Smart" title="What to Bring">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 max-w-4xl mx-auto mb-10">
          {whatToBring.map((s) => (
            <Reveal key={s} className="flex items-start gap-3">
              <CheckCircle2 className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
              <p className="text-rtg-mist">{s}</p>
            </Reveal>
          ))}
        </div>
        <div className="text-center">
          <img src={images.ridesGear} alt="Cycling gear checklist" className="rounded-3xl mx-auto max-w-2xl w-full aspect-video object-cover" />
        </div>
      </Section>

      <Section dark eyebrow="Questions" title="Frequently Asked Questions" className="pb-32">
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={rideFaqs} />
        </div>
        <div className="text-center mt-12">
          <Button href="https://strava.com/clubs/RideTeaGupShup" size="lg">Join Ride</Button>
        </div>
      </Section>
    </>
  );
}
