import { motion } from "framer-motion";
import { Trophy, Flame, Medal } from "lucide-react";
import { useLeaderboard, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import Reveal, { StaggerGroup, StaggerItem } from "../components/ui/Reveal";
import AnimatedCounter from "../components/ui/AnimatedCounter";

function formatKm(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

const RANK_STYLES = {
  0: "text-rtg-orange-400",
  1: "text-rtg-white/70",
  2: "text-rtg-white/50",
};

// Podium medal treatment for the top 3 — gold/orange for #1, silver-ish
// cool tone for #2, bronze-green for #3, echoing the reference's
// leaderTrophyIdleV2 rank badges.
const PODIUM_STYLES = [
  {
    badge: "bg-gradient-to-br from-rtg-orange-400 via-rtg-orange-500 to-rtg-purple-400",
    ring: "border-rtg-orange-400/40",
    glow: "shadow-[0_18px_40px_-12px_rgba(247,107,28,0.35)]",
    label: "text-rtg-orange-500",
    icon: Trophy,
    lift: "md:-translate-y-5",
  },
  {
    badge: "bg-gradient-to-br from-rtg-purple-400 to-rtg-purple-600",
    ring: "border-rtg-purple-400/30",
    glow: "shadow-[0_14px_32px_-14px_rgba(94,67,161,0.3)]",
    label: "text-rtg-purple-400",
    icon: Medal,
    lift: "",
  },
  {
    badge: "bg-gradient-to-br from-rtg-mist to-rtg-purple-600/70",
    ring: "border-rtg-border",
    glow: "shadow-[0_14px_28px_-14px_rgba(109,103,114,0.3)]",
    label: "text-rtg-mist",
    icon: Medal,
    lift: "",
  },
];

// Idle floating icon drift — same formula as rtg-float-* keyframes but
// driven inline via Framer Motion since these icons aren't part of the
// shared FloatingIcons component's fixed set.
const idleFloat = (delay = 0) => ({
  animate: { y: [0, -10, 0], rotate: [-4, 3, -4] },
  transition: { duration: 9, repeat: Infinity, ease: "easeInOut", delay },
});

export default function Leaderboard() {
  const images = useSiteImages();
  const rows = useLeaderboard();
  const top3 = rows.slice(0, 3);

  return (
    <>
      <PageHero
        image={images.leaderboardHero}
        eyebrow="Powered by Strava"
        title="Leaderboard"
        subtitle="Total distance logged by every RTG member who's connected Strava — updated automatically as new activities come in."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section eyebrow="Community Rankings" title="Total Distance" light>
        {/* Decorative idle-floating sport icons, visible on mobile too */}
        <motion.div
          className="pointer-events-none absolute left-[4%] top-6 text-rtg-orange-400/20 hidden sm:block"
          {...idleFloat(0)}
        >
          <Flame size={64} strokeWidth={1.5} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute right-[6%] top-24 text-rtg-purple-400/20 hidden sm:block"
          {...idleFloat(1.2)}
        >
          <Trophy size={56} strokeWidth={1.5} />
        </motion.div>

        {/* Live-update badge */}
        <Reveal className="relative z-10 flex justify-center mb-10">
          <div className="glass inline-flex items-center gap-2.5 rounded-full px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase text-rtg-mist">
              Live &middot; synced from Strava
            </span>
          </div>
        </Reveal>

        {rows.length === 0 ? (
          <Reveal className="relative z-10 max-w-md mx-auto text-center py-14">
            <Trophy className="text-rtg-mist mx-auto mb-4" size={32} />
            <p className="text-rtg-mist">
              No one's logged an activity yet — connect Strava from your Dashboard and be the first on the board.
            </p>
          </Reveal>
        ) : (
          <div className="relative z-10 space-y-14">
            {/* Podium — top 3 */}
            {top3.length > 0 && (
              <StaggerGroup className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto items-end" stagger={0.12}>
                {top3.map((r, i) => {
                  const style = PODIUM_STYLES[i];
                  const Icon = style.icon;
                  return (
                    <StaggerItem key={r.user_id} direction="up">
                      <motion.div
                        whileHover={{ y: -6 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className={`glass rounded-3xl p-6 text-center border ${style.ring} ${style.glow} ${style.lift}`}
                      >
                        <div className="flex justify-center mb-3">
                          <motion.div
                            animate={{ rotate: [0, 4, 0, -4, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                            className={`w-14 h-14 rounded-2xl grid place-items-center text-white font-display text-2xl ${style.badge}`}
                          >
                            {i === 0 ? <Icon size={26} /> : <span>{i + 1}</span>}
                          </motion.div>
                        </div>

                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt={r.full_name}
                            className="w-14 h-14 rounded-full object-cover mx-auto mb-3 border-2 border-rtg-border"
                          />
                        ) : (
                          <span className="w-14 h-14 rounded-full bg-rtg-orange-500/20 flex items-center justify-center text-lg font-semibold text-rtg-orange-400 mx-auto mb-3">
                            {(r.full_name || "?")[0]}
                          </span>
                        )}

                        <p className="font-semibold text-rtg-white truncate">{r.full_name || "RTG Member"}</p>

                        <p className={`font-display text-3xl mt-2 ${style.label}`}>
                          <AnimatedCounter
                            value={Number((Number(r.total_distance_meters || 0) / 1000).toFixed(1))}
                            suffix=" km"
                          />
                        </p>
                        <p className="text-xs text-rtg-mist mt-1">{r.activity_count} activities</p>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            )}

            {/* Full rankings table */}
            <Reveal className="max-w-2xl mx-auto overflow-x-auto rounded-2xl border border-rtg-border glass">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rtg-border text-left text-xs uppercase tracking-wide text-rtg-mist">
                    <th className="px-4 py-3 font-semibold w-12">#</th>
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold text-right">Distance</th>
                    <th className="px-4 py-3 font-semibold text-right hidden sm:table-cell">Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr
                      key={r.user_id}
                      className="border-b border-rtg-border last:border-0"
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04 }}
                      whileHover={{ backgroundColor: "rgba(247,107,28,0.04)" }}
                    >
                      <td className={`px-4 py-3 font-display text-lg ${RANK_STYLES[i] || "text-rtg-mist"}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {i < 3 && <Trophy size={14} className={PODIUM_STYLES[i].label} />}
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.full_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-rtg-orange-500/20 flex items-center justify-center text-xs font-semibold text-rtg-orange-300">
                              {(r.full_name || "?")[0]}
                            </span>
                          )}
                          <span className="font-medium">{r.full_name || "RTG Member"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rtg-white/90">
                        {formatKm(r.total_distance_meters)}
                      </td>
                      <td className="px-4 py-3 text-right text-rtg-mist hidden sm:table-cell">{r.activity_count}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          </div>
        )}
      </Section>
    </>
  );
}
