import { useEvents, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import EventCard from "../components/ui/EventCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function Events() {
  const images = useSiteImages();
  const events = useEvents();

  // Which section an event shows in is admin-picked (event_status), not
  // guessed from a date — event_date is free text like "June 2027", not a
  // real date. Falls back to the old `featured` flag, then just the first
  // event, so a single not-yet-categorized event (e.g. right after this
  // feature ships) still has somewhere sensible to show up.
  const flagship = events.find((e) => e.status === "Flagship") || events.find((e) => e.featured) || events[0];
  const upcoming = events.filter((e) => e.status === "Upcoming" && e.id !== flagship?.id);
  const past = events.filter((e) => e.status === "Past" && e.id !== flagship?.id);

  return (
    <>
      <PageHero
        image={images.eventsHero}
        eyebrow="Race. Ride. Run."
        title="Events"
        subtitle="From pan-India virtual challenges to local meetups — find your next start line."
      />

      {flagship && (
        <Section contentKey="events.featured" eyebrow="Flagship" title="Our Flagship Event">
          <Reveal>
            <EventCard event={flagship} featured />
          </Reveal>
        </Section>
      )}

      <Section
        contentKey="events.upcoming"
        dark
        eyebrow="Mark Your Calendar"
        title="Upcoming Events"
        subtitle="Regularly happening — championships, challenges, adventures, and workshops throughout the year."
      >
        {upcoming.length === 0 ? (
          <p className="text-center text-rtg-mist py-10">No upcoming events listed right now — check back soon.</p>
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((e) => (
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
        title="Past Events"
        subtitle="A look back at what the community has already pulled off."
      >
        {past.length === 0 ? (
          <p className="text-center text-rtg-mist py-10">Nothing here yet — our first events are still ahead of us.</p>
        ) : (
          <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {past.map((e) => (
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
