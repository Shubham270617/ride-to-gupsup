import { images } from "../data/images";
import { communityGroups, brand } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import JoinCTA from "../components/sections/JoinCTA";
import { MapPin, Users } from "lucide-react";

export default function Community() {
  return (
    <>
      <PageHero
        image={images.communityHero}
        eyebrow="Who We Are"
        title="One Community, Every Sport"
        subtitle="Cyclists, runners, swimmers, triathletes, beginners, veterans, and the volunteers who hold it all together — everyone belongs at RTG."
      />

      <Section
        eyebrow="Come As You Are"
        title="Everyone Is Welcome"
        subtitle="Regardless of age or fitness level, there's a place for you in the RTG community. We believe endurance sport should be accessible, not intimidating."
      >
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {communityGroups.map((g) => (
            <StaggerItem key={g.title}>
              <GlassCard className="p-0 overflow-hidden h-full group" hover>
                <div className="h-48 overflow-hidden">
                  <img
                    src={images[g.key]}
                    alt={g.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{g.title}</h3>
                  <p className="text-rtg-mist text-sm leading-relaxed">{g.desc}</p>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section dark eyebrow="Where We Ride" title="RTG Across India">
        <Reveal className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {brand.cities.map((c) => (
            <span key={c} className="glass px-5 py-2.5 rounded-full text-sm font-medium text-rtg-white/90 flex items-center gap-2">
              <MapPin size={14} className="text-rtg-orange-400" /> {c}
            </span>
          ))}
          <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-rtg-orange-400 border-2 border-dashed border-rtg-orange-400/40">
            + Expanding
          </span>
        </Reveal>
        <Reveal className="text-center flex items-center justify-center gap-3 text-rtg-mist">
          <Users className="text-rtg-orange-400" size={22} />
          <span className="text-lg">{brand.members} members and growing every week</span>
        </Reveal>
      </Section>

      <Section eyebrow="Get Involved" title="Volunteer With RTG" center={false}>
        <div className="glass rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="font-display text-3xl mb-3">RTG runs on volunteers.</h3>
            <p className="text-rtg-mist max-w-xl leading-relaxed">
              From ride marshalling to event logistics and photography, volunteers are the backbone of every
              RTG session. If you love the community and want to give back, we'd love to have you.
            </p>
          </div>
          <Button to="/contact" size="lg" className="shrink-0">Become a Volunteer</Button>
        </div>
      </Section>

      <JoinCTA />
    </>
  );
}
