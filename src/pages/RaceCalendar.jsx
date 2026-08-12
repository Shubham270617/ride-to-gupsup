import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { images } from "../data/images";
import { calendarCategories, calendarEvents, calendarCities, calendarDifficulties } from "../data/content";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function RaceCalendar() {
  const [cursor, setCursor] = useState(new Date(2027, 0, 1));
  const [activeFilters, setActiveFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calendarEvents.filter((e) => {
      const d = new Date(e.date);
      const inMonth = d.getFullYear() === year && d.getMonth() === month;
      const passesCategory = activeFilters.length === 0 || activeFilters.includes(e.cat);
      const passesSearch = !q || e.title.toLowerCase().includes(q);
      const passesCity = cityFilter === "All" || e.city === cityFilter;
      const passesDifficulty = difficultyFilter === "All" || e.difficulty === difficultyFilter;
      return inMonth && passesCategory && passesSearch && passesCity && passesDifficulty;
    });
  }, [year, month, activeFilters, search, cityFilter, difficultyFilter]);

  const eventsByDay = useMemo(() => {
    const map = {};
    monthEvents.forEach((e) => {
      const day = new Date(e.date).getDate();
      map[day] = map[day] || [];
      map[day].push(e);
    });
    return map;
  }, [monthEvents]);

  const toggleFilter = (key) => {
    setActiveFilters((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  };

  const catColor = (cat) => calendarCategories.find((c) => c.key === cat)?.color || "#f76b1c";

  return (
    <>
      <PageHero
        image={images.calendarHero}
        eyebrow="Plan Ahead"
        title="Race Calendar"
        subtitle="Cycling, running, MTB, triathlons, community rides, and adventure tours — all in one place."
        height="h-[50vh] md:h-[55vh]"
      />

      <Section>
        <Reveal className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
            />
          </div>
        </Reveal>

        <Reveal className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-full glass px-4 py-2 text-sm text-rtg-white/80 focus:outline-none"
          >
            <option value="All" className="bg-rtg-ink">All Cities</option>
            {calendarCities.map((c) => (
              <option key={c} value={c} className="bg-rtg-ink">{c}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-full glass px-4 py-2 text-sm text-rtg-white/80 focus:outline-none"
          >
            <option value="All" className="bg-rtg-ink">All Difficulties</option>
            {calendarDifficulties.map((d) => (
              <option key={d} value={d} className="bg-rtg-ink">{d}</option>
            ))}
          </select>
        </Reveal>

        <Reveal className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {calendarCategories.map((c) => {
            const active = activeFilters.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleFilter(c.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  active ? "border-transparent text-rtg-ink" : "glass text-rtg-white/80 border-white/10"
                }`}
                style={active ? { backgroundColor: c.color } : undefined}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? "currentColor" : c.color }} />
                {c.label}
              </button>
            );
          })}
        </Reveal>

        <Reveal className="glass rounded-3xl p-5 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="w-10 h-10 rounded-full glass hover:text-rtg-orange-400 flex items-center justify-center"
            >
              ‹
            </button>
            <h3 className="font-display text-2xl md:text-3xl">{monthNames[month]} {year}</h3>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="w-10 h-10 rounded-full glass hover:text-rtg-orange-400 flex items-center justify-center"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs text-rtg-mist uppercase tracking-wide">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className={`aspect-square rounded-xl p-1.5 text-xs flex flex-col ${
                  day ? "bg-white/5" : ""
                } ${eventsByDay[day]?.length ? "ring-1 ring-rtg-orange-400/50" : ""}`}
              >
                {day && (
                  <>
                    <span className="text-rtg-white/70">{day}</span>
                    <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {eventsByDay[day]?.slice(0, 2).map((e) => (
                        <span
                          key={e.title}
                          title={e.title}
                          className="w-full h-1.5 rounded-full"
                          style={{ backgroundColor: catColor(e.cat) }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </Reveal>

        <Reveal className="max-w-4xl mx-auto mt-10 space-y-3">
          {monthEvents.length === 0 && (
            <p className="text-center text-rtg-mist">No events this month yet — check back soon.</p>
          )}
          {monthEvents.map((e) => (
            <div key={e.title} className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor(e.cat) }} />
                <div className="min-w-0">
                  <span className="font-medium block truncate">{e.title}</span>
                  <span className="text-xs text-rtg-mist">
                    {e.city}{e.difficulty ? ` · ${e.difficulty}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm text-rtg-mist">
                  {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <Button to="/contact" size="md" className="!px-4 !py-1.5 !text-xs">Register</Button>
              </div>
            </div>
          ))}
        </Reveal>
      </Section>
    </>
  );
}
