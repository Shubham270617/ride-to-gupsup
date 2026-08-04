import { images } from "../data/images";
import { faqs } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import FAQAccordion from "../components/ui/FAQAccordion";
import JoinCTA from "../components/sections/JoinCTA";

export default function FAQ() {
  return (
    <>
      <PageHero
        image={images.faqHero}
        eyebrow="Got Questions?"
        title="Frequently Asked Questions"
        subtitle="Everything you need to know before your first RTG session."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section>
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={faqs} />
        </div>
      </Section>

      <JoinCTA />
    </>
  );
}
