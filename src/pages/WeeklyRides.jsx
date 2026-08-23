import { MapPin, Clock, Bike, CheckCircle2, Gauge, IndianRupee, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { rideSafety, whatToBring, rideFaqs, brand } from "../data/content";
import { useWeeklySessions, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import FAQAccordion from "../components/ui/FAQAccordion";
import Button from "../components/ui/Button";

function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export default function WeeklyRides() {
  const images = useSiteImages();
  const sessions = useWeeklySessions();
  // The hero info cards mirror the real "Friday Bricks" row from Weekly
  // Sessions (admin-editable) instead of a separate hardcoded copy, so
  // editing it there can't silently fall out of sync with what's shown here.
  const fridayBricks = sessions.find((s) => s.name === "Friday Bricks");
  const infoCards = [
    { icon: MapPin, label: "Location", value: fridayBricks?.location || "Nehru Park, Delhi" },
    { icon: Clock, label: "Time", value: fridayBricks?.time || "5:00 – 5:30 AM" },
    { icon: Bike, label: "Format", value: fridayBricks?.format || "30km Cycling + 5km Run" },
  ];

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
            <Button href={brand.social.strava.url} size="lg">Join This Ride</Button>
          </Reveal>
        </div>
      </Section>

      <Section contentKey="weeklyRides.schedule" dark eyebrow="More Sessions" title="Weekly Schedule">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sessions.map((s) => (
            <StaggerItem key={`${s.day}-${s.name}`}>
              <GlassCard className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-rtg-orange-400">{s.day}</span>
                  {s.difficulty && (
                    <span className="text-[10px] uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded-full text-rtg-mist">
                      {s.difficulty}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl mb-2">{s.name}</h3>
                {s.description && <p className="text-rtg-mist text-sm leading-relaxed mb-4 flex-1">{s.description}</p>}
                <div className="space-y-1.5 text-xs text-rtg-mist">
                  {s.time && (
                    <p className="flex items-center gap-1.5">
                      <Clock size={12} className="text-rtg-orange-400 shrink-0" /> {s.time}
                    </p>
                  )}
                  {s.location && (
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-rtg-orange-400 shrink-0" /> {s.location}
                    </p>
                  )}
                  {s.format && (
                    <p className="flex items-center gap-1.5">
                      <Bike size={12} className="text-rtg-orange-400 shrink-0" /> {s.format}
                    </p>
                  )}
                  {s.paceGroup && (
                    <p className="flex items-center gap-1.5">
                      <Gauge size={12} className="text-rtg-orange-400 shrink-0" /> {s.paceGroup}
                    </p>
                  )}
                  {s.cost && (
                    <p className="flex items-center gap-1.5">
                      <IndianRupee size={12} className="text-rtg-orange-400 shrink-0" /> {s.cost}
                    </p>
                  )}
                </div>
                {s.routeMapQuery && (
                  <div className="mt-4 rounded-xl overflow-hidden h-32 border border-white/10">
                    <iframe
                      title={`${s.name} route map`}
                      src={mapEmbedUrl(s.routeMapQuery)}
                      className="w-full h-full border-0 grayscale invert-[0.92] contrast-[1.1]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
                {s.slug && (
                  <Link
                    to={`/weekly-rides/${s.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-orange-400 hover:text-rtg-orange-300 transition-colors mt-4"
                  >
                    View Details <ArrowRight size={12} />
                  </Link>
                )}
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section contentKey="weeklyRides.safety" eyebrow="Ride Prepared" title="Safety Guidelines">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 max-w-4xl mx-auto">
          {rideSafety.map((s) => (
            <Reveal key={s} className="flex items-start gap-3">
              <CheckCircle2 className="text-rtg-orange-400 shrink-0 mt-0.5" size={20} />
              <p className="text-rtg-mist">{s}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section contentKey="weeklyRides.packList" eyebrow="Pack Smart" title="What to Bring">
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

      <Section contentKey="weeklyRides.faq" dark eyebrow="Questions" title="Frequently Asked Questions" className="pb-32">
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={rideFaqs} />
        </div>
        <div className="text-center mt-12">
          <Button href={brand.social.strava.url} size="lg">Join Ride</Button>
        </div>
      </Section>
    </>
  );
}
