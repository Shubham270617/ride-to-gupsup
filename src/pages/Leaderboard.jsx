import { Trophy } from "lucide-react";
import { useLeaderboard, useSiteImages } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";

function formatKm(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

const RANK_STYLES = {
  0: "text-rtg-orange-400",
  1: "text-rtg-white/70",
  2: "text-rtg-white/50",
};

export default function Leaderboard() {
  const images = useSiteImages();
  const rows = useLeaderboard();

  return (
    <>
      <PageHero
        image={images.leaderboardHero}
        eyebrow="Powered by Strava"
        title="Leaderboard"
        subtitle="Total distance logged by every RTG member who's connected Strava — updated automatically as new activities come in."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section eyebrow="Community Rankings" title="Total Distance">
        {rows.length === 0 ? (
          <Reveal className="max-w-md mx-auto text-center py-14">
            <Trophy className="text-rtg-mist mx-auto mb-4" size={32} />
            <p className="text-rtg-mist">
              No one's logged an activity yet — connect Strava from your Dashboard and be the first on the board.
            </p>
          </Reveal>
        ) : (
          <Reveal className="max-w-2xl mx-auto overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-rtg-mist">
                  <th className="px-4 py-3 font-semibold w-12">#</th>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold text-right">Distance</th>
                  <th className="px-4 py-3 font-semibold text-right hidden sm:table-cell">Activities</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id} className="border-b border-white/5 last:border-0">
                    <td className={`px-4 py-3 font-display text-lg ${RANK_STYLES[i] || "text-rtg-mist"}`}>{i + 1}</td>
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
                    <td className="px-4 py-3 text-right font-semibold text-rtg-white/90">{formatKm(r.total_distance_meters)}</td>
                    <td className="px-4 py-3 text-right text-rtg-mist hidden sm:table-cell">{r.activity_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        )}
      </Section>
    </>
  );
}
