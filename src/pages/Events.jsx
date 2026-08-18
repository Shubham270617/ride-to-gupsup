import { useEvents, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import EventCard from "../components/ui/EventCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function Events() {
  const images = useSiteImages();
  const events = useEvents();
  const featured = events.find((e) => e.featured) || events[0];
  const rest = events.filter((e) => !e.featured);

  return (
    <>
      <PageHero
        image={images.eventsHero}
        eyebrow="Race. Ride. Run."
        title="Upcoming Events"
        subtitle="From pan-India virtual challenges to local meetups — find your next start line."
      />

      <Section contentKey="events.featured" eyebrow="Flagship" title="Featured Event">
        <Reveal>
          <EventCard event={featured} featured />
        </Reveal>
      </Section>

      <Section contentKey="events.moreEvents" dark eyebrow="Mark Your Calendar" title="More Events" subtitle="Championships, challenges, adventures, and workshops throughout the year.">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((e) => (
            <StaggerItem key={e.id}>
              <EventCard event={e} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <JoinCTA />
    </>
  );
}
