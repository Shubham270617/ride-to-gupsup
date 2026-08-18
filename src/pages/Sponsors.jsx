import { sponsorOpportunities, sponsorTiers, brand } from "../data/content";
import { useSiteSettings, useSponsors, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import { FileDown, Check, Users, TrendingUp, MapPin, Megaphone } from "lucide-react";

const whySponsorStats = [
  { icon: Users, label: "Audience", value: `${brand.members} active endurance athletes across every RTG channel` },
  { icon: TrendingUp, label: "Reach", value: "Thousands of monthly impressions across Instagram, WhatsApp, and Strava" },
  { icon: MapPin, label: "Cities", value: `${brand.cities.length}+ Indian cities and growing every quarter` },
  { icon: Megaphone, label: "Brand Exposure", value: "Logo placement on jerseys, event banners, email, and social posts" },
];

export default function Sponsors() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const sponsors = useSponsors();
  return (
    <>
      <PageHero
        image={images.sponsorsHero}
        eyebrow="Partner With RTG"
        title="Power the Movement"
        subtitle="Reach 500+ engaged endurance athletes across India through events, merchandise, and digital campaigns."
      />

      <Section contentKey="sponsors.why" eyebrow="Why Sponsor RTG" title="Put Your Brand in Front of India's Endurance Athletes">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-4">
          {whySponsorStats.map((s) => (
            <StaggerItem key={s.label}>
              <GlassCard className="h-full text-center">
                <s.icon className="text-rtg-orange-400 mx-auto mb-3" size={28} />
                <p className="text-xs uppercase tracking-widest text-rtg-mist mb-2">{s.label}</p>
                <p className="text-sm text-rtg-white/90 leading-relaxed">{s.value}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {sponsors.length > 0 && (
        <Section contentKey="sponsors.current" eyebrow="Current Partners" title="Brands Backing RTG">
          <StaggerGroup className="flex flex-wrap items-center justify-center gap-6">
            {sponsors.map((s) => (
              <StaggerItem key={s.name}>
                <a
                  href={s.website || undefined}
                  target={s.website ? "_blank" : undefined}
                  rel={s.website ? "noopener noreferrer" : undefined}
                  className="glass px-6 py-5 rounded-2xl flex flex-col items-center gap-2 hover:border-rtg-orange-400/40 transition-colors"
                >
                  {s.logo ? (
                    <img src={s.logo} alt={s.name} className="h-10 w-auto object-contain" />
                  ) : (
                    <span className="font-display text-xl text-rtg-white/80">{s.name}</span>
                  )}
                  {s.tier && <span className="text-[10px] uppercase tracking-wide text-rtg-orange-400">{s.tier}</span>}
                </a>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Section>
      )}

      <Section contentKey="sponsors.opportunities" eyebrow="Sponsorship Opportunities" title="Ways to Partner">
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {sponsorOpportunities.map((s) => (
            <StaggerItem key={s.title}>
              <GlassCard className="h-full">
                <h3 className="font-display text-2xl mb-2 text-rtg-orange-400">{s.title}</h3>
                <p className="text-rtg-mist text-sm leading-relaxed">{s.desc}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section contentKey="sponsors.packages" dark eyebrow="Investment Tiers" title="Sponsorship Packages">
        <StaggerGroup className="grid md:grid-cols-3 gap-6 mb-16">
          {sponsorTiers.map((tier, i) => (
            <StaggerItem key={tier.name}>
              <GlassCard className={`h-full ${i === 0 ? "border-rtg-orange-400/50" : ""}`}>
                {i === 0 && (
                  <span className="inline-block bg-rtg-orange-500 text-rtg-ink text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                    Most Impact
                  </span>
                )}
                <h3 className="font-display text-2xl mb-1">{tier.name}</h3>
                <p className="text-rtg-orange-400 font-semibold text-xl mb-5">{tier.price}</p>
                <ul className="space-y-2.5">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-rtg-mist">
                      <Check size={15} className="text-rtg-orange-400 shrink-0 mt-0.5" /> {p}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="glass rounded-3xl p-10 md:p-16 text-center max-w-3xl mx-auto">
          <h3 className="font-display text-3xl md:text-4xl mb-4">Ready to Partner With RTG?</h3>
          <p className="text-rtg-mist mb-8 max-w-xl mx-auto">
            {settings.sponsor_deck_url
              ? "Download our sponsor deck for audience data, past activations, and partnership packages."
              : "Request our sponsor deck for audience data, past activations, and partnership packages."}
          </p>
          {settings.sponsor_deck_url ? (
            <Button href={settings.sponsor_deck_url} size="lg" icon={FileDown}>Download Sponsor Deck</Button>
          ) : (
            <Button to="/contact" size="lg" icon={FileDown}>Request Sponsor Deck</Button>
          )}
        </Reveal>
      </Section>
    </>
  );
}
