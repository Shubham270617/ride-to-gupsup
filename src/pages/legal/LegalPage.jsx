import Section from "../../components/ui/Section";
import Reveal from "../../components/ui/Reveal";

export default function LegalPage({ title, updated, sections }) {
  return (
    <div className="pt-32 pb-20">
      <Section title={title} subtitle={updated} center={false}>
        <div className="max-w-3xl space-y-10">
          {sections.map((s) => (
            <Reveal key={s.heading}>
              <h2 className="font-display text-2xl mb-2 text-rtg-orange-400">{s.heading}</h2>
              <p className="text-rtg-mist leading-relaxed">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
