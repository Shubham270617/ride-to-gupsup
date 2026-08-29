import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, CalendarPlus } from "lucide-react";
import { calendarCategories, calendarCities, calendarDifficulties } from "../data/content";
import { useCalendarEvents, useWeeklySessions, useEvents, useSiteImages } from "../lib/publicData";
import { downloadIcsFile } from "../lib/ics";
import PageHero from "../components/ui/PageHero";
import Section from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// Every date in the visible month that falls on a weekly session's day —
// e.g. Friday Bricks shows up as its own entry on every Friday, not just
// listed once separately from the actual dated events.
function projectWeeklySessions(sessions, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const occurrences = [];
  sessions.forEach((s) => {
    const weekday = WEEKDAY_INDEX[s.day];
    if (weekday === undefined) return;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === weekday) {
        occurrences.push({
          key: `weekly-${s.slug || s.id}-${d}`,
          date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          title: s.name,
          cat: "weekly",
          city: null,
          difficulty: s.difficulty,
          slug: null,
          type: "weekly",
          session: s,
        });
      }
    }
  });
  return occurrences;
}

// Any Event with a Calendar Date set (Admin → Events) shows up here
// automatically — no separate Race Calendar entry needed for it.
function eventsWithCalendarDate(events) {
  const knownCats = calendarCategories.map((c) => c.key);
  return events
    .filter((e) => e.calendarDate)
    .map((e) => {
      const guessedCat = (e.categories?.[0] || "").toLowerCase();
      return {
        key: `flagship-${e.slug || e.id}`,
        date: e.calendarDate,
        title: e.title,
        cat: knownCats.includes(guessedCat) ? guessedCat : "cycling",
        city: null,
        difficulty: null,
        slug: e.slug,
        type: "event",
      };
    });
}

export default function RaceCalendar() {
  const images = useSiteImages();
  const calendarEvents = useCalendarEvents();
  const weeklySessions = useWeeklySessions();
  const events = useEvents();
  const [cursor, setCursor] = useState(() => new Date());
  const [activeFilters, setActiveFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const combinedEvents = useMemo(() => {
    const dated = calendarEvents.map((e) => ({ ...e, key: `event-${e.slug || e.title}-${e.date}`, type: "event" }));
    const fromEvents = eventsWithCalendarDate(events);
    const weekly = projectWeeklySessions(weeklySessions, year, month);
    return [...dated, ...fromEvents, ...weekly];
  }, [calendarEvents, events, weeklySessions, year, month]);

  const monthEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return combinedEvents
      .filter((e) => {
        const d = new Date(e.date);
        const inMonth = d.getFullYear() === year && d.getMonth() === month;
        const passesCategory = activeFilters.length === 0 || activeFilters.includes(e.cat);
        const passesSearch = !q || e.title.toLowerCase().includes(q);
        const passesCity = cityFilter === "All" || e.city === cityFilter;
        const passesDifficulty = difficultyFilter === "All" || e.difficulty === difficultyFilter;
        return inMonth && passesCategory && passesSearch && passesCity && passesDifficulty;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [combinedEvents, year, month, activeFilters, search, cityFilter, difficultyFilter]);

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

  const registerTo = (e) => {
    if (e.type === "weekly") return e.session.slug ? `/weekly-rides/${e.session.slug}` : "/weekly-rides";
    return e.slug ? `/events/${e.slug}` : `/contact?activity=${encodeURIComponent(e.title)}`;
  };

  const addToCalendar = (e) => {
    if (e.type === "weekly") {
      const [h, m] = parseTimeToHm(e.session.time);
      const start = new Date(e.date);
      if (h != null) start.setHours(h, m || 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1, end.getMinutes() + 30);
      downloadIcsFile({
        title: e.title,
        description: e.session.description || e.session.format || "",
        location: e.session.location || "",
        ...(h != null ? { start, end } : { allDayDate: new Date(e.date) }),
      });
    } else {
      downloadIcsFile({
        title: e.title,
        description: [e.difficulty, e.city].filter(Boolean).join(" · "),
        location: e.city || "",
        allDayDate: new Date(e.date),
      });
    }
  };

  return (
    <>
      <PageHero
        image={images.calendarHero}
        eyebrow="Plan Ahead"
        title="Race Calendar"
        subtitle="Cycling, running, MTB, triathlons, community rides, adventure tours, and every weekly session — all in one place."
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
            <div className="text-center">
              <h3 className="font-display text-2xl md:text-3xl">{monthNames[month]} {year}</h3>
              <button
                onClick={() => setCursor(new Date())}
                className="text-xs text-rtg-orange-400 hover:text-rtg-orange-300 transition-colors"
              >
                Jump to today
              </button>
            </div>
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
            {cells.map((day, i) => {
              const isToday =
                day &&
                year === new Date().getFullYear() &&
                month === new Date().getMonth() &&
                day === new Date().getDate();
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`aspect-square rounded-xl p-1.5 text-xs flex flex-col ${day ? "bg-white/5" : ""} ${
                    eventsByDay[day]?.length ? "ring-1 ring-rtg-orange-400/50" : ""
                  } ${isToday ? "ring-2 ring-rtg-orange-400" : ""}`}
                >
                  {day && (
                    <>
                      <span className={isToday ? "text-rtg-orange-400 font-bold" : "text-rtg-white/70"}>{day}</span>
                      <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                        {eventsByDay[day]?.slice(0, 2).map((e) => (
                          <span
                            key={e.key}
                            title={e.title}
                            className="w-full h-1.5 rounded-full"
                            style={{ backgroundColor: catColor(e.cat) }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="max-w-4xl mx-auto mt-10 space-y-3">
          {monthEvents.length === 0 && (
            <p className="text-center text-rtg-mist">No events this month yet — check back soon.</p>
          )}
          {monthEvents.map((e) => (
            <div key={e.key} className="glass rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor(e.cat) }} />
                <div className="min-w-0">
                  <span className="font-medium block truncate">
                    {e.title}
                    {e.type === "weekly" && <span className="text-rtg-mist font-normal"> · Weekly</span>}
                  </span>
                  <span className="text-xs text-rtg-mist">
                    {[e.city, e.difficulty].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-rtg-mist">
                  {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={() => addToCalendar(e)}
                  aria-label={`Add ${e.title} to your calendar`}
                  title="Add to Calendar"
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-rtg-mist hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors"
                >
                  <CalendarPlus size={14} />
                </button>
                <Button to={registerTo(e)} size="md" className="!px-4 !py-1.5 !text-xs">
                  {e.type === "weekly" ? "View Details" : "Register"}
                </Button>
              </div>
            </div>
          ))}
        </Reveal>
      </Section>
    </>
  );
}

// "5:00 AM" -> [5, 0]. Returns [null, null] if the time can't be parsed
// (free text field — admin might leave it as "TBC" etc.), which the caller
// treats as "make this an all-day .ics entry instead of a timed one."
function parseTimeToHm(timeStr) {
  if (!timeStr) return [null, null];
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return [null, null];
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return [h, m];
}
