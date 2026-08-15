import { useMemo, useState } from "react";
import { Trophy, Download } from "lucide-react";
import { images } from "../data/images";
import { useRaceResults } from "../lib/publicData";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";

export default function RaceResults() {
  const results = useRaceResults();
  const [eventFilter, setEventFilter] = useState("All");

  const eventNames = useMemo(() => ["All", ...new Set(results.map((r) => r.eventName))], [results]);
  const filtered = eventFilter === "All" ? results : results.filter((r) => r.eventName === eventFilter);

  return (
    <>
      <PageHero
        image={images.raceResultsHero}
        eyebrow="Podiums & Personal Bests"
        title="Race Results"
        subtitle="Every finish line, every PB, every RTG athlete who showed up and gave it everything."
        height="h-[45vh] md:h-[50vh]"
      />

      <Section eyebrow="Results Archive" title="Past Race Results">
        <Reveal className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {eventNames.map((name) => (
            <button
              key={name}
              onClick={() => setEventFilter(name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                eventFilter === name ? "bg-rtg-orange-500 text-rtg-ink" : "glass text-rtg-white/75 hover:text-rtg-white"
              }`}
            >
              {name}
            </button>
          ))}
        </Reveal>

        <Reveal className="max-w-4xl mx-auto overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-rtg-mist">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Athlete</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Year</th>
                <th className="px-4 py-3 font-semibold">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-rtg-mist">
                    No results for this event yet.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-rtg-white/90">{r.eventName}</td>
                  <td className="px-4 py-3 text-rtg-white/90">{r.athleteName}</td>
                  <td className="px-4 py-3 text-rtg-mist">{r.category || "—"}</td>
                  <td className="px-4 py-3 text-rtg-mist">{r.finishTime || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-rtg-orange-400 font-semibold">
                      <Trophy size={13} /> {r.position || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-rtg-mist">{r.year}</td>
                  <td className="px-4 py-3">
                    {r.certificateUrl ? (
                      <a
                        href={r.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-orange-400 hover:text-rtg-orange-300 transition-colors"
                      >
                        <Download size={13} /> Download
                      </a>
                    ) : (
                      <span className="text-rtg-mist text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>
    </>
  );
}
