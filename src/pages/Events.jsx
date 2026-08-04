import { images } from "../data/images";
import { events } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import EventCard from "../components/ui/EventCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import JoinCTA from "../components/sections/JoinCTA";

export default function Events() {
  const featured = events.find((e) => e.featured);
  const rest = events.filter((e) => !e.featured);

  return (
    <>
      <PageHero
        image={images.eventsHero}
        eyebrow="Race. Ride. Run."
        title="Upcoming Events"
        subtitle="From pan-India virtual challenges to local meetups — find your next start line."
      />

      <Section eyebrow="Flagship" title="Featured Event">
        <Reveal>
          <EventCard event={featured} featured />
        </Reveal>
      </Section>

      <Section dark eyebrow="Mark Your Calendar" title="More Events" subtitle="Championships, challenges, adventures, and workshops throughout the year.">
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
