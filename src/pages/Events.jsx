import { useEvents, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import EventCard from "../components/ui/EventCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

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
        <Section contentKey="events.featured" eyebrow="Signature" title="Signature Events">
          <div className="space-y-8">
            {signatureEvents.map((e) => (
              <Reveal key={e.id}>
                <EventCard event={e} featured badgeLabel="Signature Event" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section
        contentKey="events.upcoming"
        dark
        eyebrow="Mark Your Calendar"
        title="Coming Up"
        subtitle="Regularly happening — championships, challenges, adventures, and workshops throughout the year."
      >
        {comingUp.length === 0 ? (
          <p className="text-center text-rtg-mist py-10">No upcoming events listed right now — check back soon.</p>
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingUp.map((e) => (
              <StaggerItem key={e.id}>
                <EventCard event={e} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </Section>

      <Section
        contentKey="events.past"
        eyebrow="Where We've Been"
        title="Past Highlights"
        subtitle="A look back at what the community has already pulled off."
      >
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
