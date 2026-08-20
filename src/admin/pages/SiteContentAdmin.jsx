import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
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

// Custom-shaped groups — not the generic eyebrow/title/subtitle a
// <Section contentKey> renders, so each keeps its own field list. Home's
// About RTG headline matches the {t("text.home.about...", ...)} calls in
// src/pages/Home.jsx; Footer matches the {t("text.footer...", ...)} calls
// in src/components/Footer.jsx.
const CUSTOM_GROUPS = {
  Home: [
    {
      heading: "About RTG section",
      fields: [
        { key: "text.home.aboutEyebrow", label: "Eyebrow", fallback: "This Is RTG", type: "text" },
        { key: "text.home.aboutTitleLine1", label: "Headline — line 1", fallback: "More Than Miles.", type: "text" },
        { key: "text.home.aboutTitleLine2", label: "Headline — line 2 (accent color)", fallback: "More Than Sport.", type: "text" },
        { key: "text.home.aboutBody", label: "Paragraph", fallback: "Ride Tea GupShup brings cyclists, runners, and endurance enthusiasts together to move, connect, learn, and create experiences worth remembering.", type: "textarea" },
        { key: "text.home.aboutButtonLabel", label: "Button label", fallback: "Discover Our Story", type: "text" },
      ],
    },
    {
      heading: "Instagram Feed",
      fields: [
        {
          key: "integration.instagram_embed_url",
          label: "Embed URL (from a free widget like SnapWidget or LightWidget — leave blank to keep showing sample photos)",
          fallback: "",
          type: "text",
        },
      ],
    },
  ],
  Footer: [
    {
      heading: "Footer",
      fields: [
        { key: "text.footer.description", label: "Description (under the logo)", fallback: "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures.", type: "textarea" },
        { key: "text.footer.copyright", label: "Copyright line (after \"© {year}\")", fallback: "Ride Tea GupShup. All rights reserved.", type: "text" },
        { key: "text.footer.tagline", label: "Bottom-right tagline", fallback: "Built for athletes, by athletes.", type: "text" },
      ],
    },
  ],
};

const PAGES = [...new Set([...SECTIONS.map((s) => s.page), ...Object.keys(CUSTOM_GROUPS)])].sort();

function Field({ label, value, fallback, multiline, onChange }) {
  return (
    <div>
      <label className="block text-xs text-rtg-mist mb-1.5">{label}</label>
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

function SaveButton({ status, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "saving"}
      className="mt-5 inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-5 py-2 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
    >
      {status === "saving" && <Loader2 size={14} className="animate-spin" />}
      {status === "saved" && <Check size={14} />}
      {status === "saved" ? "Saved" : "Save"}
    </button>
  );
}

export default function SiteContentAdmin() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({}); // { [groupKey]: "saving" | "saved" }
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

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  // Saves every field in one card at once, only when "Save" is clicked —
  // typing into a field just updates local state until then.
  const saveGroup = async (groupKey, rows) => {
    setStatus((s) => ({ ...s, [groupKey]: "saving" }));
    await Promise.all(
      rows.map(({ key, label }) => supabase.from("site_settings").upsert({ key, value: values[key] ?? "", label }))
    );
    setStatus((s) => ({ ...s, [groupKey]: "saved" }));
    setTimeout(() => setStatus((s) => (s[groupKey] === "saved" ? { ...s, [groupKey]: "" } : s)), 1500);
  };

  const sectionsForPage = SECTIONS.filter((s) => s.page === page);
  const customGroupsForPage = CUSTOM_GROUPS[page] || [];

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Site Content</h1>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Edit the wording used on the public site, page by page. Make your changes, then hit Save on that section —
        it goes live immediately, no code, no developer needed.
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
            {customGroupsForPage.map((group) => (
              <div key={group.heading} className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-5">{group.heading}</h2>
                <div className="space-y-4">
                  {group.fields.map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      value={values[f.key]}
                      fallback={f.fallback}
                      multiline={f.type === "textarea"}
                      onChange={(v) => setField(f.key, v)}
                    />
                  ))}
                </div>
                <SaveButton status={status[group.heading]} onClick={() => saveGroup(group.heading, group.fields)} />
              </div>
            ))}

            {sectionsForPage.map((s) => {
              const rows = [
                { key: `text.${s.key}.eyebrow`, label: `${s.label} — Eyebrow` },
                { key: `text.${s.key}.title`, label: `${s.label} — Title` },
                { key: `text.${s.key}.subtitle`, label: `${s.label} — Subtitle` },
              ];
              return (
                <div key={s.key} className="glass rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-5">{s.label}</h2>
                  <div className="space-y-4">
                    <Field
                      label="Eyebrow"
                      value={values[rows[0].key]}
                      fallback={s.eyebrow}
                      onChange={(v) => setField(rows[0].key, v)}
                    />
                    <Field
                      label="Title"
                      value={values[rows[1].key]}
                      fallback={s.title}
                      onChange={(v) => setField(rows[1].key, v)}
                    />
                    <Field
                      label="Subtitle"
                      value={values[rows[2].key]}
                      fallback={s.subtitle}
                      multiline
                      onChange={(v) => setField(rows[2].key, v)}
                    />
                  </div>
                  <SaveButton status={status[s.key]} onClick={() => saveGroup(s.key, rows)} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
