import { motion } from "framer-motion";
import { useEvents, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import EventCard from "../components/ui/EventCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

// Small "editorial number" kicker — mirrors the brand reference's
// `events-editorial-number-v3` treatment (big faint Bebas numeral + small
// label, divider rule) used to introduce each board section. Purely
// decorative, built from the existing font-display / rtg-mist tokens
// instead of new CSS.
function SectionIndex({ n, label }) {
  return (
    <Reveal direction="left" className="flex items-end gap-5 pb-6 mb-10 border-b border-rtg-border">
      <span className="font-display text-[clamp(3rem,8vw,5rem)] leading-[0.75] text-rtg-orange-500/20 select-none">
        {n}
      </span>
      <span className="pb-1 text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-rtg-mist">
        {label}
      </span>
    </Reveal>
  );
}

// Quiet orbit-ring accent reused from Home's Hero (same inline-animation
// pattern: three nested rings using the already-defined rtg-orbit-spin /
// -reverse / -pulse keyframes from index.css). Desktop only, so it never
// competes with the stacked signature cards on mobile.
function OrbitAccent() {
  return (
    <div className="hidden lg:block absolute z-0 -top-10 -right-10 w-[22vw] max-w-[300px] aspect-square pointer-events-none opacity-70">
      <div className="absolute inset-0 rounded-full border border-rtg-purple-400/20" style={{ animation: "rtg-orbit-spin 22s linear infinite" }} />
      <div className="absolute inset-[14%] rounded-full border border-rtg-orange-400/25" style={{ animation: "rtg-orbit-spin-reverse 16s linear infinite" }} />
      <div className="absolute inset-[29%] rounded-full border border-rtg-purple-300/30" style={{ animation: "rtg-orbit-pulse 4.6s ease-in-out infinite" }} />
    </div>
  );
}

// Route-dash SVG accent — a dashed line "drawing" itself infinitely, plus a
// couple of pulsing dots, echoing the reference's `.event-bg-route-v2` /
// `.event-bg-pulse-v2` treatment. Built with the shared `.rtg-route-dash` /
// `.rtg-pulse-dot` classes already defined in index.css (no new global CSS).
function RouteAccent({ className = "" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full text-white/10">
        <path
          d="M-10 150 C120 60, 220 190, 340 90 S520 30, 620 110"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="rtg-route-dash"
        />
      </svg>
      <span className="rtg-pulse-dot absolute left-[12%] top-[38%] w-2 h-2 rounded-full bg-rtg-orange-500" />
      <span
        className="rtg-pulse-dot absolute right-[16%] top-[62%] w-2 h-2 rounded-full bg-rtg-purple-300"
        style={{ animationDelay: "1.1s" }}
      />
    </div>
  );
}

export default function Events() {
  const images = useSiteImages();
  const events = useEvents();

  // Which section an event shows in is admin-picked (event_status stores
  // "Flagship"/"Upcoming"/"Past" — display names are "Signature Events" /
  // "Coming Up" / "Past Highlights", relabeled in the admin form only, not
  // in the database). Signature Events supports more than one — by
  // definition it's the handful (typically 1–2 a year) of biggest events,
  // not a single fixed slot. Falls back to the old `featured` flag, then
  // just the first event, so a not-yet-categorized event still shows up
  // somewhere sensible instead of disappearing.
  const signatureEvents = (() => {
    const tagged = events.filter((e) => e.status === "Flagship");
    if (tagged.length > 0) return tagged;
    const fallback = events.find((e) => e.featured) || events[0];
    return fallback ? [fallback] : [];
  })();
  const signatureIds = new Set(signatureEvents.map((e) => e.id));
  const comingUp = events.filter((e) => e.status === "Upcoming" && !signatureIds.has(e.id));
  const pastHighlights = events.filter((e) => e.status === "Past" && !signatureIds.has(e.id));

  return (
    <>
      <PageHero
        image={images.eventsHero}
        eyebrow="Race. Ride. Run."
        title="Events"
        subtitle="From pan-India virtual challenges to local meetups — find your next start line."
      />

      {signatureEvents.length > 0 && (
        <Section contentKey="events.featured" eyebrow="Signature" title="Signature Events" className="relative">
          <OrbitAccent />
          <div className="relative z-10">
            <SectionIndex n="01" label="Discover · Flagship" />
            <div className="space-y-8">
              {signatureEvents.map((e) => (
                <Reveal key={e.id}>
                  <EventCard event={e} featured badgeLabel="Signature Event" />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section
        contentKey="events.upcoming"
        dark
        eyebrow="Mark Your Calendar"
        title="Coming Up"
        subtitle="Regularly happening — championships, challenges, adventures, and workshops throughout the year."
        className="relative"
      >
        <RouteAccent />
        <div className="relative z-10">
          <SectionIndex n="02" label="What's Next" />
          {comingUp.length === 0 ? (
            <p className="text-center text-rtg-mist py-10">No upcoming events listed right now — check back soon.</p>
          ) : (
            <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingUp.map((e) => (
                <StaggerItem key={e.id}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                    <EventCard event={e} />
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </div>
      </Section>

      <Section
        contentKey="events.past"
        light
        eyebrow="Where We've Been"
        title="Past Highlights"
        subtitle="A look back at what the community has already pulled off."
      >
        <SectionIndex n="03" label="The Archive" />
        {pastHighlights.length === 0 ? (
          <p className="text-center text-rtg-mist py-10">Nothing here yet — our first events are still ahead of us.</p>
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastHighlights.map((e) => (
              <StaggerItem key={e.id}>
                <EventCard event={e} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      <JoinCTA />
    </>
  );
}
