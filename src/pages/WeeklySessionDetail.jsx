import { useParams, Navigate } from "react-router-dom";
import { Clock, MapPin, Bike, Gauge, IndianRupee, CheckCircle2 } from "lucide-react";
import { useWeeklySession, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";

function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export default function WeeklySessionDetail() {
  const { slug } = useParams();
  const session = useWeeklySession(slug);
  const images = useSiteImages();

  if (!session) {
    return <Navigate to="/weekly-rides" replace />;
  }

  const facts = [
    { icon: Clock, label: "Time", value: session.time },
    { icon: MapPin, label: "Location", value: session.location },
    { icon: Bike, label: "Format", value: session.format },
    { icon: Gauge, label: "Pace Group", value: session.paceGroup },
    { icon: IndianRupee, label: "Cost", value: session.cost },
  ].filter((f) => f.value);

  return (
    <>
      <PageHero
        image={images.ridesHero}
        eyebrow={session.day}
        title={session.name}
        subtitle={session.description}
      />

      <Section>
        <div className="flex flex-wrap items-center gap-4 mb-14 justify-center">
          <span className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-rtg-white/90">
            {session.day}{session.time ? ` · ${session.time}` : ""}
          </span>
          {session.difficulty && (
            <span className="px-4 py-2 rounded-full text-sm bg-white/5 text-rtg-mist">{session.difficulty}</span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-14">
          <Reveal>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400">About This Session</h3>
              <p className="text-rtg-mist leading-relaxed">
                {session.description || "Details for this session will be published soon — check back closer to the date."}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {facts.map((f) => (
                  <p key={f.label} className="flex items-center gap-2 text-sm text-rtg-mist">
                    <f.icon size={14} className="text-rtg-orange-400 shrink-0" />
                    <span className="text-rtg-white/90">{f.value}</span>
                  </p>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.05}>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400 flex items-center gap-2">
                <MapPin size={20} /> Location
              </h3>
              <p className="text-rtg-mist leading-relaxed mb-4">
                {session.location || "Location will be announced closer to the session."}
              </p>
              {session.routeMapQuery && (
                <div className="rounded-2xl overflow-hidden h-56">
                  <iframe
                    title={`${session.name} location map`}
                    src={mapEmbedUrl(session.routeMapQuery)}
                    className="w-full h-full border-0 grayscale invert-[0.92] contrast-[1.1]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </GlassCard>
          </Reveal>
        </div>

        <Reveal className="glass rounded-3xl p-10 md:p-14 text-center mb-14">
          <h3 className="font-display text-3xl md:text-4xl mb-4">How to Join</h3>
          <p className="text-rtg-mist mb-8 max-w-xl mx-auto">
            Just show up — no advance sign-up required for most weeks. Want us to save you a spot, get reminders,
            or ask a question first? Send us a note and we'll get you sorted.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {[
              "No experience needed, all paces welcome",
              session.cost || "Free to join",
              "Bring water + your own gear",
            ].map((note) => (
              <span key={note} className="flex items-center gap-1.5 text-xs text-rtg-mist glass px-3 py-1.5 rounded-full">
                <CheckCircle2 size={13} className="text-rtg-orange-400" /> {note}
              </span>
            ))}
          </div>
          <Button to={`/contact?activity=${encodeURIComponent(session.name)}`} size="lg">
            Join Now
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
