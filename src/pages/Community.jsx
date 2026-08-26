import { rtgMoments, joinSteps } from "../data/content";
import { useTeamMembers, useWeeklySessions, useSiteImages } from "../lib/publicData";
import { useAuthGate } from "../lib/AuthGateContext";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import CommunityProof from "../components/sections/CommunityProof";
import JoinCTA from "../components/sections/JoinCTA";
import { CalendarClock, Sparkles, ArrowRight } from "lucide-react";
import { InstagramIcon } from "../components/ui/SocialIcons";

const scrollToJoin = () => {
  document.getElementById("join-rtg")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Community() {
  const images = useSiteImages();
  const teamMembers = useTeamMembers();
  const weeklySessions = useWeeklySessions();
  const { requestLogin } = useAuthGate();

  return (
    <>
      {/* 1. HERO — real people, immediate invitation */}
      <PageHero
        image={images.communityHero}
        eyebrow="Who We Are"
        title="One Community. Every Journey."
        subtitle="Cyclists, runners, swimmers, beginners, and veterans — everyone belongs at RTG. Come as you are, leave with your people."
      />
      <div className="relative -mt-10 md:-mt-14 z-10 flex justify-center pb-10">
        <Button onClick={scrollToJoin} size="lg" icon={ArrowRight}>Join RTG</Button>
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
      >
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
        light
        eyebrow="Getting Started"
        title="Way to Be Part of RTG"
        subtitle="Seven steps from stranger to teammate."
      >
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
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
        <Reveal className="text-center">
          <Button onClick={() => requestLogin("signup")} size="lg">Get Started</Button>
        </Reveal>
      </Section>

      {/* 5. UPCOMING COMMUNITY EXPERIENCES — weekly rhythm + a direct link to the calendar */}
      <Section
        contentKey="community.upcoming"
        light
        eyebrow="Don't Miss Out"
        title="Upcoming Community Experiences"
        subtitle="Our weekly rhythm — full calendar has everything else, races included."
      >
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {weeklySessions.slice(0, 4).map((s) => (
            <StaggerItem key={s.slug || s.name}>
              <GlassCard className="h-full text-center flex flex-col">
                <span className="text-rtg-orange-400 font-display text-lg tracking-wide flex items-center justify-center gap-2">
                  <CalendarClock size={16} /> {s.day}
                </span>
                <h3 className="font-display text-xl my-2">{s.name}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed flex-1">{s.format || s.description}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <Reveal className="text-center">
          <Button to="/race-calendar" variant="outline" size="lg" icon={ArrowRight}>View Full Calendar</Button>
        </Reveal>
      </Section>

      {/* 6. MEMBER VOICES */}
      <Section contentKey="community.voices" light eyebrow="Member Voices" title="The People Behind RTG">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((m) => (
            <StaggerItem key={m.name}>
              <GlassCard className="text-center h-full">
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
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* 7. VOLUNTEER — LAUNCHING SOON */}
      <Section contentKey="community.volunteer" light eyebrow="Get Involved" title="Volunteer With RTG">
        <Reveal>
          <GlassCard className="max-w-xl mx-auto text-center py-14">
            <Sparkles className="text-rtg-orange-400 mx-auto mb-4" size={32} />
            <h3 className="font-display text-2xl mb-2">Launching Soon</h3>
            <p className="text-rtg-mist text-sm leading-relaxed max-w-sm mx-auto">
              We're building a proper volunteer program — marshalling, event logistics, photography, and more.
              Check back soon, or reach out if you can't wait.
            </p>
          </GlassCard>
        </Reveal>
      </Section>

      {/* 8. FINAL CTA */}
      <JoinCTA
        primaryLabel="Join the Community"
        onPrimaryClick={() => requestLogin("signup")}
        secondaryLabel="Explore Upcoming Events"
        secondaryTo="/race-calendar"
      />
    </>
  );
}
