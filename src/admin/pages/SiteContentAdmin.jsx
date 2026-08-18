import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Every <Section contentKey="..."> on the public site reads its
// eyebrow/title/subtitle from "text.<key>.{eyebrow,title,subtitle}" in
// site_settings, falling back to the text below when nothing's been set.
// To make another section editable: add contentKey="page.slug" to its
// <Section> in the page file, then add one entry here with the same key
// and its current copy as the fallback.
const SECTIONS = [
  { page: "About", key: "about.whyExists", label: "Why RTG Exists", eyebrow: "", title: "Why RTG Exists", subtitle: "" },
  { page: "About", key: "about.missionVision", label: "Mission & Vision", eyebrow: "What Drives Us", title: "Mission & Vision", subtitle: "" },
  { page: "About", key: "about.coreValues", label: "Our Core Values", eyebrow: "What We Stand For", title: "Our Core Values", subtitle: "" },
  { page: "About", key: "about.timeline", label: "RTG Timeline", eyebrow: "How Far We've Come", title: "RTG Timeline", subtitle: "" },
  { page: "About", key: "about.leadership", label: "Our Leadership", eyebrow: "The People Behind RTG", title: "Our Leadership", subtitle: "" },

  { page: "Blog", key: "blog.hero", label: "From the Journal", eyebrow: "Latest", title: "From the Journal", subtitle: "" },

  { page: "Challenges", key: "challenges.hero", label: "Current Challenges", eyebrow: "Live & Upcoming", title: "Current Challenges", subtitle: "" },

  { page: "Community", key: "community.howToJoin", label: "How to Join RTG", eyebrow: "Getting Started", title: "How to Join RTG", subtitle: "Seven steps from stranger to teammate." },
  { page: "Community", key: "community.welcome", label: "Everyone Is Welcome", eyebrow: "Come As You Are", title: "Everyone Is Welcome", subtitle: "Regardless of age or fitness level, there's a place for you in the RTG community. We believe endurance sport should be accessible, not intimidating." },
  { page: "Community", key: "community.acrossIndia", label: "RTG Across India", eyebrow: "Where We Ride", title: "RTG Across India", subtitle: "" },
  { page: "Community", key: "community.volunteer", label: "Volunteer With RTG", eyebrow: "Get Involved", title: "Volunteer With RTG", subtitle: "" },
  { page: "Community", key: "community.timeline", label: "RTG Timeline", eyebrow: "How Far We've Come", title: "RTG Timeline", subtitle: "" },

  { page: "Events", key: "events.featured", label: "Featured Event", eyebrow: "Flagship", title: "Featured Event", subtitle: "" },
  { page: "Events", key: "events.moreEvents", label: "More Events", eyebrow: "Mark Your Calendar", title: "More Events", subtitle: "Championships, challenges, adventures, and workshops throughout the year." },

  { page: "Home", key: "home.whyJoin", label: "Why Athletes Join RTG", eyebrow: "Why RTG", title: "Why Athletes Join RTG", subtitle: "Six reasons endurance athletes across India call RTG home." },
  { page: "Home", key: "home.weeklyActivities", label: "Weekly Activities", eyebrow: "Weekly Rhythm", title: "Weekly Activities", subtitle: "Consistency builds champions. Here's how our week looks." },
  { page: "Home", key: "home.upcomingEvents", label: "Upcoming Events", eyebrow: "Don't Miss Out", title: "Upcoming Events", subtitle: "" },
  { page: "Home", key: "home.gallery", label: "Community Gallery", eyebrow: "Moments", title: "Community Gallery", subtitle: "Finish lines, sunrise starts, and everything in between." },
  { page: "Home", key: "home.store", label: "Gear Up Like a Pro", eyebrow: "RTG Store", title: "Gear Up Like a Pro", subtitle: "" },
  { page: "Home", key: "home.sponsors", label: "Our Sponsors & Partners", eyebrow: "Trusted By", title: "Our Sponsors & Partners", subtitle: "Brands that fuel the RTG movement." },
  { page: "Home", key: "home.testimonials", label: "What Our Community Says", eyebrow: "Athlete Voices", title: "What Our Community Says", subtitle: "" },

  { page: "Merchandise", key: "merch.hero", label: "All Merchandise", eyebrow: "Shop", title: "All Merchandise", subtitle: "Free community pride, premium quality — order yours today." },
  { page: "Merchandise", key: "merch.perks", label: "Members Save 10%", eyebrow: "Member Perks", title: "Members Save 10%", subtitle: "" },
  { page: "Merchandise", key: "merch.sizeChart", label: "Size Chart", eyebrow: "Fit Guide", title: "Size Chart", subtitle: "" },
  { page: "Merchandise", key: "merch.reviews", label: "What Riders Say About Our Gear", eyebrow: "Athlete Reviews", title: "What Riders Say About Our Gear", subtitle: "" },

  { page: "Race Results", key: "raceResults.hero", label: "Past Race Results", eyebrow: "Results Archive", title: "Past Race Results", subtitle: "" },

  { page: "Safety", key: "safety.guidelines", label: "General Safety Guidelines", eyebrow: "Every Session, Every Time", title: "General Safety Guidelines", subtitle: "" },
  { page: "Safety", key: "safety.checklist", label: "Weekly Session Checklist", eyebrow: "Friday Bricks", title: "Weekly Session Checklist", subtitle: "" },

  { page: "Sponsors", key: "sponsors.why", label: "Put Your Brand in Front of India's Endurance Athletes", eyebrow: "Why Sponsor RTG", title: "Put Your Brand in Front of India's Endurance Athletes", subtitle: "" },
  { page: "Sponsors", key: "sponsors.current", label: "Brands Backing RTG", eyebrow: "Current Partners", title: "Brands Backing RTG", subtitle: "" },
  { page: "Sponsors", key: "sponsors.opportunities", label: "Ways to Partner", eyebrow: "Sponsorship Opportunities", title: "Ways to Partner", subtitle: "" },
  { page: "Sponsors", key: "sponsors.packages", label: "Sponsorship Packages", eyebrow: "Investment Tiers", title: "Sponsorship Packages", subtitle: "" },

  { page: "Weekly Rides", key: "weeklyRides.schedule", label: "Weekly Schedule", eyebrow: "More Sessions", title: "Weekly Schedule", subtitle: "" },
  { page: "Weekly Rides", key: "weeklyRides.safety", label: "Safety Guidelines", eyebrow: "Ride Prepared", title: "Safety Guidelines", subtitle: "" },
  { page: "Weekly Rides", key: "weeklyRides.packList", label: "What to Bring", eyebrow: "Pack Smart", title: "What to Bring", subtitle: "" },
  { page: "Weekly Rides", key: "weeklyRides.faq", label: "Frequently Asked Questions", eyebrow: "Questions", title: "Frequently Asked Questions", subtitle: "" },
];

// Home's About RTG section has a custom two-line headline + paragraph +
// button, not the generic eyebrow/title/subtitle shape, so it keeps its
// own field list (matches the {t("text.home.about...", ...)} calls in
// src/pages/Home.jsx).
const HOME_ABOUT_FIELDS = [
  { key: "text.home.aboutEyebrow", label: "Eyebrow", fallback: "This Is RTG", type: "text" },
  { key: "text.home.aboutTitleLine1", label: "Headline — line 1", fallback: "More Than Miles.", type: "text" },
  { key: "text.home.aboutTitleLine2", label: "Headline — line 2 (accent color)", fallback: "More Than Sport.", type: "text" },
  { key: "text.home.aboutBody", label: "Paragraph", fallback: "Ride Tea GupShup brings cyclists, runners, and endurance enthusiasts together to move, connect, learn, and create experiences worth remembering.", type: "textarea" },
  { key: "text.home.aboutButtonLabel", label: "Button label", fallback: "Discover Our Story", type: "text" },
];

const PAGES = [...new Set(SECTIONS.map((s) => s.page))];

function Field({ label, value, fallback, saved, multiline, onChange }) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs text-rtg-mist mb-1.5">
        {label}
        {saved && <span className="text-rtg-orange-400">Saved</span>}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
        />
      ) : (
        <input
          type="text"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
        />
      )}
    </div>
  );
}

export default function SiteContentAdmin() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [savedKey, setSavedKey] = useState("");
  const [page, setPage] = useState(PAGES[0]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from("site_settings")
      .select("key,value")
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((r) => {
          map[r.key] = r.value;
        });
        setValues(map);
        setLoading(false);
      });
  }, []);

  const handleChange = async (key, label, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    await supabase.from("site_settings").upsert({ key, value, label });
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? "" : k)), 1500);
  };

  const sectionsForPage = SECTIONS.filter((s) => s.page === page);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Site Content</h1>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Edit the wording used on the public site, page by page. Changes save automatically and go live
        immediately — no code, no developer needed.
      </p>

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : (
        <>
          <div className="mb-8 max-w-xs">
            <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-2">Page</label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
            >
              {PAGES.map((p) => (
                <option key={p} value={p} className="bg-rtg-ink">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            {page === "Home" && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-5">About RTG section</h2>
                <div className="space-y-4">
                  {HOME_ABOUT_FIELDS.map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      value={values[f.key]}
                      fallback={f.fallback}
                      saved={savedKey === f.key}
                      multiline={f.type === "textarea"}
                      onChange={(v) => handleChange(f.key, f.label, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {sectionsForPage.map((s) => (
              <div key={s.key} className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-5">{s.label}</h2>
                <div className="space-y-4">
                  <Field
                    label="Eyebrow"
                    value={values[`text.${s.key}.eyebrow`]}
                    fallback={s.eyebrow}
                    saved={savedKey === `text.${s.key}.eyebrow`}
                    onChange={(v) => handleChange(`text.${s.key}.eyebrow`, `${s.label} — Eyebrow`, v)}
                  />
                  <Field
                    label="Title"
                    value={values[`text.${s.key}.title`]}
                    fallback={s.title}
                    saved={savedKey === `text.${s.key}.title`}
                    onChange={(v) => handleChange(`text.${s.key}.title`, `${s.label} — Title`, v)}
                  />
                  <Field
                    label="Subtitle"
                    value={values[`text.${s.key}.subtitle`]}
                    fallback={s.subtitle}
                    saved={savedKey === `text.${s.key}.subtitle`}
                    multiline
                    onChange={(v) => handleChange(`text.${s.key}.subtitle`, `${s.label} — Subtitle`, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
