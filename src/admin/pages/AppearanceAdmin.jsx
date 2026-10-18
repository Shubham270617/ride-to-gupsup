import { useEffect, useState } from "react";
import { Check, Loader2, Type, Palette, CaseSensitive } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  APPEARANCE_KEYS,
  BODY_FONTS,
  TEXT_COLORS,
  TEXT_SCALES,
  applyAppearance,
  resolveAppearance,
} from "../../lib/appearance";
import AdminPageHeader from "../components/AdminPageHeader";

// Admin -> Appearance. Three choices — text size, typeface, text colour —
// each a fixed set of presets rather than free input, so nothing an admin
// picks here can break the layout, make text unreadable, or wreck the
// mobile view. See lib/appearance.js for what each option actually sets.
//
// The preview below the controls is live and applied to the real page as
// soon as something is selected, so the effect is visible before saving.
// Leaving without saving reverts it.

function OptionCard({ option, selected, onSelect, children }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className={`relative text-left rounded-2xl border p-4 transition-colors ${
        selected
          ? "border-rtg-orange-400 bg-rtg-orange-500/10"
          : "border-rtg-border bg-rtg-purple-950/[0.04] hover:border-rtg-orange-400/50"
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-rtg-orange-500 text-white">
          <Check size={12} />
        </span>
      )}
      <span className="block text-sm font-semibold text-rtg-white pr-6">{option.label}</span>
      <span className="block text-xs text-rtg-mist mt-0.5">{option.hint}</span>
      {children}
    </button>
  );
}

function Group({ icon: Icon, title, description, children }) {
  return (
    <section className="glass rounded-2xl p-5 mb-6">
      <h2 className="font-display text-xl flex items-center gap-2 mb-1">
        <Icon size={17} className="text-rtg-orange-400" /> {title}
      </h2>
      <p className="text-rtg-mist text-xs mb-4 max-w-xl">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export default function AppearanceAdmin() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from("site_settings")
      .select("key,value")
      .in("key", Object.values(APPEARANCE_KEYS))
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((r) => {
          map[r.key] = r.value;
        });
        setValues(map);
        setLoading(false);
      });
  }, []);

  // Preview on the real page as soon as something changes — including on
  // first load, so the dashboard reflects what the public site looks like.
  useEffect(() => {
    if (loading) return;
    applyAppearance(values);
  }, [values, loading]);

  const set = (key, value) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const rows = [
        { key: APPEARANCE_KEYS.scale, value: values[APPEARANCE_KEYS.scale] ?? "1", label: "Appearance — text size" },
        { key: APPEARANCE_KEYS.font, value: values[APPEARANCE_KEYS.font] ?? "default", label: "Appearance — typeface" },
        { key: APPEARANCE_KEYS.color, value: values[APPEARANCE_KEYS.color] ?? "default", label: "Appearance — text colour" },
      ];
      const { error: err } = await supabase.from("site_settings").upsert(rows);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () =>
    setValues({
      [APPEARANCE_KEYS.scale]: "1",
      [APPEARANCE_KEYS.font]: "default",
      [APPEARANCE_KEYS.color]: "default",
    });

  const current = resolveAppearance(values);

  if (loading) return <p className="text-rtg-mist text-sm">Loading…</p>;

  return (
    <div>
      <AdminPageHeader
        title="Appearance"
        description={"Change how text looks across the whole public site — no code needed. Every option is a preset chosen to stay within the design, so none of them can break the layout or the mobile view. Changes preview here instantly and go live when you save."}
      />

      <Group
        icon={CaseSensitive}
        title="Text size"
        description="Scales all text and spacing together, so the layout keeps its proportions rather than text overflowing its boxes."
      >
        {TEXT_SCALES.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            selected={current.scale.value === option.value}
            onSelect={(v) => set(APPEARANCE_KEYS.scale, v)}
          >
            <span className="block mt-2 text-rtg-white" style={{ fontSize: `${Number(option.value) * 15}px` }}>
              Ride Tea GupShup
            </span>
          </OptionCard>
        ))}
      </Group>

      <Group
        icon={Type}
        title="Typeface"
        description="Body text only — headings keep the RTG display font. Only typefaces the site already loads are offered, so switching costs no extra loading time."
      >
        {BODY_FONTS.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            selected={current.font.value === option.value}
            onSelect={(v) => set(APPEARANCE_KEYS.font, v)}
          >
            <span className="block mt-2 text-sm text-rtg-white" style={{ fontFamily: option.stack }}>
              Every ride starts with chai.
            </span>
          </OptionCard>
        ))}
      </Group>

      <Group
        icon={Palette}
        title="Text colour"
        description="Sets the main and secondary text colours. All three options are checked for contrast against the site's light background."
      >
        {TEXT_COLORS.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            selected={current.color.value === option.value}
            onSelect={(v) => set(APPEARANCE_KEYS.color, v)}
          >
            <span className="mt-2 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full border border-rtg-border" style={{ background: option.ink }} />
              <span className="h-5 w-5 rounded-full border border-rtg-border" style={{ background: option.muted }} />
            </span>
          </OptionCard>
        ))}
      </Group>

      {error && <p className="text-rtg-orange-400 text-sm mb-3">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] text-white shadow-[0_10px_24px_-12px_rgba(247,107,28,0.9)] font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-500 transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saved ? "Saved" : "Save changes"}
        </button>
        <button
          onClick={reset}
          className="rounded-full bg-rtg-purple-950/[0.04] text-rtg-mist px-5 py-2.5 text-sm font-semibold hover:text-rtg-orange-400 hover:bg-rtg-purple-950/[0.07] transition-colors"
        >
          Reset to defaults
        </button>
        <span className="text-xs text-rtg-mist">Previewing live — leave without saving to revert.</span>
      </div>
    </div>
  );
}
