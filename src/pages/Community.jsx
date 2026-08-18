import { communityGroups, brand, joinSteps, communityTimeline } from "../data/content";
import { useTeamMembers, useWeeklySessions, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import JoinCTA from "../components/sections/JoinCTA";
import { MapPin, Users, Award, GraduationCap, Gift, ClipboardCheck } from "lucide-react";
import { InstagramIcon } from "../components/ui/SocialIcons";

const volunteerHighlights = [
  { icon: Gift, title: "Benefits", desc: "Free entry to RTG events, exclusive volunteer kit, and priority registration for high-demand rides." },
  { icon: Award, title: "Certificate", desc: "A signed certificate of contribution after every 20 volunteer hours — great for CVs and college applications." },
  { icon: GraduationCap, title: "Leadership Path", desc: "Consistent volunteers are the first considered for chapter captain and event lead roles as RTG grows." },
  { icon: ClipboardCheck, title: "Apply", desc: "No experience needed — just show up, tell us what you're into (marshalling, photography, logistics), and we'll fit you in." },
];

export default function Community() {
  const images = useSiteImages();
  const teamMembers = useTeamMembers();
  const weeklySessions = useWeeklySessions();
  const hasDelhiSchedule = weeklySessions.length > 0;

  return (
    <>
      <PageHero
        image={images.communityHero}
        eyebrow="Who We Are"
        title="One Community, Every Sport"
        subtitle="Cyclists, runners, swimmers, triathletes, beginners, veterans, and the volunteers who hold it all together — everyone belongs at RTG."
      />

      <Section contentKey="community.howToJoin" eyebrow="Getting Started" title="How to Join RTG" subtitle="Seven steps from stranger to teammate.">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
      </Section>

      <Section
        contentKey="community.welcome"
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

      <Section contentKey="community.acrossIndia" dark eyebrow="Where We Ride" title="RTG Across India">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {brand.cities.map((c) => {
            const captain = teamMembers.find((t) => t.city === c);
            return (
              <StaggerItem key={c}>
                <GlassCard className="h-full">
                  <span className="flex items-center gap-2 text-rtg-orange-400 font-semibold mb-3">
                    <MapPin size={15} /> {c}
                  </span>
                  {captain ? (
                    <>
                      <p className="text-xs text-rtg-mist uppercase tracking-wide mb-0.5">Captain</p>
                      <p className="text-sm text-rtg-white/90 mb-2">{captain.name}</p>
                      {captain.instagramUrl && (
                        <a
                          href={captain.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-rtg-mist hover:text-rtg-orange-400 transition-colors mb-3"
                        >
                          <InstagramIcon size={12} /> Follow
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-rtg-mist mb-3">Chapter captain: TBA</p>
                  )}
                  <p className="text-xs text-rtg-mist uppercase tracking-wide mb-0.5">Weekly Ride</p>
                  <p className="text-sm text-rtg-white/90">
                    {c === "Delhi" && hasDelhiSchedule ? "Friday Bricks + full weekly schedule" : "Coming as this chapter grows"}
                  </p>
                </GlassCard>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
        <Reveal className="text-center flex items-center justify-center gap-3 text-rtg-mist">
          <Users className="text-rtg-orange-400" size={22} />
          <span className="text-lg">{brand.members} members and growing every week</span>
        </Reveal>
      </Section>

      <Section contentKey="community.volunteer" eyebrow="Get Involved" title="Volunteer With RTG" center={false}>
        <div className="glass rounded-3xl p-10 md:p-14 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div>
              <h3 className="font-display text-3xl mb-3">RTG runs on volunteers.</h3>
              <p className="text-rtg-mist max-w-xl leading-relaxed">
                From ride marshalling to event logistics and photography, volunteers are the backbone of every
                RTG session. If you love the community and want to give back, we'd love to have you.
              </p>
            </div>
            <Button to="/contact" size="lg" className="shrink-0">Become a Volunteer</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {volunteerHighlights.map((v) => (
              <div key={v.title}>
                <v.icon className="text-rtg-orange-400 mb-2" size={22} />
                <h4 className="font-display text-lg mb-1">{v.title}</h4>
                <p className="text-rtg-mist text-xs leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section contentKey="community.timeline" dark eyebrow="How Far We've Come" title="RTG Timeline">
        <div className="max-w-2xl mx-auto">
          {communityTimeline.map((t, i) => (
            <Reveal key={t.label} delay={i * 0.06} className="flex gap-5 pb-10 last:pb-0">
              <div className="flex flex-col items-center shrink-0">
                <span className="w-3.5 h-3.5 rounded-full bg-rtg-orange-500 ring-4 ring-rtg-orange-500/20" />
                {i < communityTimeline.length - 1 && <span className="w-px flex-1 bg-white/10 mt-1" />}
              </div>
              <div>
                <h3 className="font-display text-xl mb-1">{t.label}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <JoinCTA />
    </>
  );
}
