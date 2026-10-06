import { MapPin } from "lucide-react";
import { useSiteSettings, buildStats, pickStates } from "../../lib/publicData";
import AnimatedCounter from "../ui/AnimatedCounter";
import Section from "../ui/Section";
import Reveal, { StaggerGroup, StaggerItem } from "../ui/Reveal";

// The numbers + "Present Across India" strip — originally built for Home,
// now shared with Community so both read the exact same admin-editable
// stats (Site Content → Home → Stats & Presence) instead of drifting apart.
export default function CommunityProof({ light = true, dark = false }) {
  const settings = useSiteSettings();
  const stats = buildStats(settings);
  const states = pickStates(settings);

  return (
    <Section light={light} dark={dark}>
      <StaggerGroup className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10 mb-16">
        {stats.map((s) => (
          <StaggerItem key={s.key}>
            <div className="text-center">
              <AnimatedCounter value={s.value} suffix={s.suffix} className="font-display text-4xl md:text-6xl text-gradient block" />
              <p className="text-rtg-mist text-xs md:text-sm mt-2 tracking-wide uppercase">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <Reveal className="text-center">
        <h3 className="font-display text-2xl md:text-4xl mb-6">Present Across India</h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {states.map((s) => (
            <span key={s} className="glass px-5 py-2.5 rounded-full text-sm font-medium text-rtg-white/90 flex items-center gap-2">
              <MapPin size={14} className="text-rtg-orange-400" /> {s}
            </span>
          ))}
          <span className="px-5 py-2.5 rounded-full text-sm font-semibold text-rtg-orange-400 border-2 border-dashed border-rtg-orange-400/40">
            + Expanding
          </span>
        </div>
      </Reveal>
    </Section>
  );
}
