import { useParams, Link, Navigate } from "react-router-dom";
import { Calendar, Tag, Mountain, Route as RouteIcon, ImageIcon, Trophy, History, Loader2 } from "lucide-react";
import { useEvent, useEventGallery } from "../lib/publicData";
import { whatToBring } from "../data/content";
import { formatPrize } from "../lib/format";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import MasonryGallery from "../components/ui/MasonryGallery";
import JoinCTA from "../components/sections/JoinCTA";

export default function EventDetail() {
  const { slug } = useParams();
  const { event, loading } = useEvent(slug);
  const eventGallery = useEventGallery(slug);

  // Wait for the real fetch to actually finish before deciding this slug
  // doesn't exist — on first render `event` is only checked against the
  // static placeholder list, which won't contain a real admin-added event.
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!event) {
    return <Navigate to="/events" replace />;
  }

  return (
    <>
      <PageHero
        image={event.image}
        eyebrow={event.type}
        title={event.title}
        subtitle={event.desc}
      />

      <Section>
        <div className="flex flex-wrap items-center gap-4 mb-14 justify-center">
          <span className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-rtg-white/90">
            <Calendar size={15} className="text-rtg-orange-400" /> {event.date}
          </span>
          {formatPrize(event.prize) && (
            <span className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-rtg-orange-300 font-semibold">
              <Tag size={15} /> {formatPrize(event.prize)}
            </span>
          )}
          {event.categories?.map((c) => (
            <span key={c} className="px-4 py-2 rounded-full text-sm bg-white/5 text-rtg-mist">
              {c}
            </span>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-14">
          <Reveal>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400">About</h3>
              <p className="text-rtg-mist leading-relaxed">{event.desc}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400 flex items-center gap-2">
                <RouteIcon size={20} /> Route
              </h3>
              <p className="text-rtg-mist leading-relaxed">
                {event.route || "Route details will be published closer to the event — check back soon."}
              </p>
              {event.routeMapQuery && (
                <div className="mt-4 rounded-2xl overflow-hidden h-56">
                  <iframe
                    title={`${event.title} route map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(event.routeMapQuery)}&output=embed`}
                    className="w-full h-full border-0 grayscale invert-[0.92] contrast-[1.1]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400 flex items-center gap-2">
                <Mountain size={20} /> Elevation
              </h3>
              <p className="text-rtg-mist leading-relaxed">{event.elevation || "TBA"}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.15}>
            <GlassCard className="h-full">
              <h3 className="font-display text-2xl mb-3 text-rtg-orange-400">Schedule</h3>
              <p className="text-rtg-mist leading-relaxed">{event.date} · {event.type}</p>
            </GlassCard>
          </Reveal>
        </div>

        <Reveal className="glass rounded-3xl p-10 md:p-14 text-center mb-14">
          <h3 className="font-display text-3xl md:text-4xl mb-4">Ready to Register?</h3>
          <p className="text-rtg-mist mb-8 max-w-xl mx-auto">
            Registration for {event.title} opens through our community channels — reach out and we'll get you signed up.
          </p>
          <Button to="/contact" size="lg">Register Interest</Button>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          <Reveal>
            <GlassCard className="h-full">
              <h3 className="font-display text-xl mb-3 text-rtg-orange-400">Gear Checklist</h3>
              <ul className="space-y-2">
                {whatToBring.slice(0, 4).map((g) => (
                  <li key={g} className="text-rtg-mist text-sm">• {g}</li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard className="h-full">
              <h3 className="font-display text-xl mb-3 text-rtg-orange-400 flex items-center gap-2">
                <History size={18} /> Previous Edition
              </h3>
              <p className="text-rtg-mist text-sm leading-relaxed">
                {event.previousEdition || "This is the first edition of this event — be part of the story from day one."}
              </p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="h-full">
              <h3 className="font-display text-xl mb-3 text-rtg-orange-400 flex items-center gap-2">
                <Trophy size={18} /> Results
              </h3>
              <p className="text-rtg-mist text-sm leading-relaxed mb-3">
                {event.results || "Results will be posted here after the event."}
              </p>
              <Link to="/race-results" className="text-sm font-semibold text-rtg-orange-400 hover:text-rtg-orange-300">
                View all race results →
              </Link>
            </GlassCard>
          </Reveal>
        </div>

        {eventGallery.length > 0 && (
          <Reveal className="mb-14">
            <h3 className="font-display text-2xl mb-5 text-center flex items-center justify-center gap-2">
              <ImageIcon size={20} className="text-rtg-orange-400" /> Event Gallery
            </h3>
            <MasonryGallery items={eventGallery.slice(0, 8)} />
          </Reveal>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-sm font-semibold text-rtg-white hover:text-rtg-orange-400 transition-colors"
          >
            <ImageIcon size={16} /> {eventGallery.length > 0 ? "View Full Gallery" : "View Event Gallery"}
          </Link>
          {event.gpxUrl && (
            <a
              href={event.gpxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-rtg-white hover:text-rtg-orange-400 transition-colors"
            >
              <RouteIcon size={16} /> Download GPX
            </a>
          )}
          <Link
            to="/sponsors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-rtg-white hover:text-rtg-orange-400 transition-colors"
          >
            Event Sponsors →
          </Link>
        </div>
      </Section>

      <JoinCTA />
    </>
  );
}
