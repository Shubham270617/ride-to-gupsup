import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Palette, FileText, ExternalLink, RotateCcw, ChevronDown, AArrowDown, AArrowUp, AlertTriangle, Type, LayoutList } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  APPEARANCE_KEYS,
  BODY_FONTS,
  DEFAULT_SIZE,
  FONT_SIZES,
  PAGE_TEXT_TARGETS,
  SECTION_TEXT_TARGETS,
  parseSectionSettings,
  TEXT_COLORS,
  ensureFontLoaded,
  fontByValue,
  parsePageSettings,
  resolveAppearance,
  sitewideSize,
  sizeNote,
} from "../../lib/appearance";
import AdminPageHeader from "../components/AdminPageHeader";

// Admin -> Appearance. Works like a word processor: pick a font from a list
// (each shown in its own typeface) and a size in pixels, for the whole site
// and, optionally, page by page. Text colour stays a set of
// contrast-checked presets. See lib/appearance.js for how it is applied.
//
// The admin area itself never changes, so the preview card below shows
// what visitors will see.

const loadAllFonts = () => BODY_FONTS.forEach(ensureFontLoaded);

// A dropdown of fonts, each option drawn in its own typeface — like the
// font box in WordPad. `inheritLabel` adds a "Site default" choice on top.
function FontPicker({ value, onChange, inheritLabel, compact = false }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = value ? fontByValue(value) : null;

  useEffect(() => {
    if (!open) return undefined;
    loadAllFonts();
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className={`relative ${compact ? "w-full sm:w-52" : "w-full sm:w-72"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-rtg-border bg-white px-3.5 py-2.5 text-left text-sm text-rtg-white shadow-sm hover:border-rtg-orange-400/60 focus:border-rtg-orange-400 focus:outline-none focus:ring-4 focus:ring-rtg-orange-400/15"
      >
        <span className="truncate" style={current ? { fontFamily: current.stack } : undefined}>
          {current ? current.label : inheritLabel}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-rtg-mist transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1.5 max-h-80 w-full min-w-60 overflow-y-auto rounded-2xl border border-rtg-border bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(27,17,48,0.55)]">
          {inheritLabel && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${!value ? "bg-rtg-orange-500/10 text-rtg-orange-600" : "text-rtg-mist hover:bg-rtg-purple-950/[0.04]"}`}
              >
                {inheritLabel}
                {!value && <Check size={14} />}
              </button>
            </li>
          )}
          {BODY_FONTS.map((f) => (
            <li key={f.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === f.value}
                onClick={() => {
                  onChange(f.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${value === f.value ? "bg-rtg-orange-500/10" : "hover:bg-rtg-purple-950/[0.04]"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-rtg-white" style={{ fontFamily: f.stack }}>
                    {f.label}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-rtg-mist">{f.hint}</span>
                </span>
                {value === f.value && <Check size={14} className="shrink-0 text-rtg-orange-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A number size box with A− / A+ buttons — like WordPad's size box and its
// grow/shrink buttons. `inheritLabel` adds a "Site default" choice.
function SizePicker({ value, onChange, inheritLabel }) {
  const index = value ? FONT_SIZES.indexOf(Number(value)) : -1;
  const step = (dir) => {
    const from = index === -1 ? FONT_SIZES.indexOf(DEFAULT_SIZE) : index;
    const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, from + dir))];
    onChange(String(next));
  };
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Smaller"
        title="Smaller"
        className="grid h-10 w-10 place-items-center rounded-xl border border-rtg-border bg-white text-rtg-mist shadow-sm hover:border-rtg-orange-400/60 hover:text-rtg-orange-600"
      >
        <AArrowDown size={17} />
      </button>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Font size in pixels"
        className="h-10 rounded-xl border border-rtg-border bg-white px-3 text-sm font-semibold tabular-nums text-rtg-white shadow-sm focus:border-rtg-orange-400 focus:outline-none focus:ring-4 focus:ring-rtg-orange-400/15"
      >
        {inheritLabel && <option value="">{inheritLabel}</option>}
        {FONT_SIZES.map((n) => (
          <option key={n} value={String(n)}>
            {n}
            {n === DEFAULT_SIZE ? " (normal)" : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Bigger"
        title="Bigger"
        className="grid h-10 w-10 place-items-center rounded-xl border border-rtg-border bg-white text-rtg-mist shadow-sm hover:border-rtg-orange-400/60 hover:text-rtg-orange-600"
      >
        <AArrowUp size={17} />
      </button>
    </div>
  );
}

// What a visitor sees: a small slice of the public site in the chosen font
// and size (rendered at that size here, not by restyling the admin).
function Preview({ size, font }) {
  useEffect(() => ensureFontLoaded(font), [font]);
  return (
    <div className="overflow-hidden rounded-2xl border border-rtg-border bg-[#faf9fc]">
      <div className="flex items-center gap-1.5 border-b border-rtg-border bg-white px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[10px] text-rtg-mist">rideteagupshup.com — preview</span>
      </div>
      <div className="p-5" style={{ fontSize: `${size}px`, fontFamily: font.stack }}>
        <p className="font-bold uppercase text-rtg-orange-600" style={{ fontSize: "0.75em", letterSpacing: "0.18em" }}>
          Weekly rides
        </p>
        <p className="font-display leading-none text-rtg-white" style={{ fontSize: "2.25em", fontFamily: undefined }}>
          Friday Brick N Burn
        </p>
        <p className="mt-2 leading-relaxed text-rtg-mist" style={{ fontSize: "1em" }}>
          Every Friday at 6 am — a 30 km ride, then a 5 km run, then chai with the crew. All paces welcome; nobody gets
          left behind.
        </p>
        <span className="mt-3 inline-flex rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-[1.2em] py-[0.6em] font-semibold text-white" style={{ fontSize: "0.875em" }}>
          Join the ride
        </span>
      </div>
    </div>
  );
}

// One section inside a page: same font and size boxes, defaulting to the
// page's own choice.
function SectionRow({ section, entry, pageSize, pageFont, onChange }) {
  const size = entry.size ? String(entry.size) : "";
  const font = entry.font || "";
  const effectiveFont = fontByValue(font || pageFont);
  const effectiveSize = entry.size || pageSize;
  const custom = Boolean(size || font);
  useEffect(() => {
    if (font) ensureFontLoaded(effectiveFont);
  }, [font, effectiveFont]);
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-rtg-border bg-rtg-purple-950/[0.02] p-3 lg:flex-row lg:items-center">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-rtg-white">
        <span className="truncate">{section.label}</span>
        {custom && <span className="rounded-full bg-rtg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rtg-orange-600">Custom</span>}
      </p>
      <span
        className="hidden w-20 shrink-0 truncate text-center text-rtg-white xl:block"
        style={{ fontFamily: effectiveFont.stack, fontSize: `${Math.min(effectiveSize, 22)}px` }}
        title={`${effectiveFont.label}, ${effectiveSize}px`}
        aria-hidden="true"
      >
        Aa Bb
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <FontPicker compact value={font} inheritLabel="Page font" onChange={(v) => onChange({ ...entry, font: v || undefined })} />
        <SizePicker value={size} inheritLabel="Page size" onChange={(v) => onChange({ ...entry, size: v ? Number(v) : undefined })} />
        {custom && (
          <button
            type="button"
            onClick={() => onChange({})}
            title="Back to the page default"
            aria-label={`Reset ${section.label}`}
            className="grid h-10 w-10 place-items-center rounded-xl text-rtg-mist hover:bg-rtg-purple-950/[0.05] hover:text-rtg-orange-600"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

function PageRow({ target, entry, siteSize, siteFont, onChange, sections = [], sectionEntries = {}, onSectionChange }) {
  const [open, setOpen] = useState(false);
  const size = entry.size ? String(entry.size) : "";
  const font = entry.font || "";
  const effectiveFont = fontByValue(font || siteFont);
  const effectiveSize = entry.size || siteSize;
  const custom = Boolean(size || font);
  const customSections = Object.keys(sectionEntries).length;
  useEffect(() => {
    if (font) ensureFontLoaded(effectiveFont);
  }, [font, effectiveFont]);
  return (
    <li className="rounded-2xl border border-rtg-border bg-white p-3.5">
     <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-rtg-white">
          {target.label}
          {custom && <span className="rounded-full bg-rtg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rtg-orange-600">Custom</span>}
          {customSections > 0 && (
            <span className="rounded-full bg-rtg-purple-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rtg-purple-600">
              {customSections} section{customSections === 1 ? "" : "s"} custom
            </span>
          )}
        </p>
        <a href={target.path} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-rtg-mist hover:text-rtg-orange-600">
          {target.path} <ExternalLink size={11} />
        </a>
      </div>
      <span
        className="hidden w-24 shrink-0 truncate text-center text-rtg-white xl:block"
        style={{ fontFamily: effectiveFont.stack, fontSize: `${Math.min(effectiveSize, 22)}px` }}
        title={`${effectiveFont.label}, ${effectiveSize}px`}
        aria-hidden="true"
      >
        Aa Bb
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <FontPicker compact value={font} inheritLabel="Site default font" onChange={(v) => onChange({ ...entry, font: v || undefined })} />
        <SizePicker value={size} inheritLabel="Site size" onChange={(v) => onChange({ ...entry, size: v ? Number(v) : undefined })} />
        {custom && (
          <button
            type="button"
            onClick={() => onChange({})}
            title="Back to the site default"
            aria-label={`Reset ${target.label}`}
            className="grid h-10 w-10 place-items-center rounded-xl text-rtg-mist hover:bg-rtg-purple-950/[0.05] hover:text-rtg-orange-600"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
     </div>
      {sections.length > 0 && (
        <div className="mt-3 border-t border-rtg-border pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full bg-rtg-purple-950/[0.04] px-3.5 py-1.5 text-xs font-semibold text-rtg-white hover:bg-rtg-purple-950/[0.07]"
          >
            <LayoutList size={13} /> {open ? "Hide sections" : `Sections (${sections.length})`}
            <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ul className="mt-3 space-y-2">
              {sections.map((sec) => (
                <SectionRow
                  key={sec.id}
                  section={sec}
                  entry={sectionEntries[sec.id] || {}}
                  pageSize={effectiveSize}
                  pageFont={font || siteFont}
                  onChange={(e) => onSectionChange(sec.id, e)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
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

  const set = (key, value) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const siteSize = sitewideSize(values);
  const siteFont = values[APPEARANCE_KEYS.font] || "default";
  const color = resolveAppearance(values, "/").color;
  const pages = parsePageSettings(values[APPEARANCE_KEYS.pages]);
  const sectionSettings = parseSectionSettings(values[APPEARANCE_KEYS.sections]);
  const sectionCount = Object.values(sectionSettings).reduce((n, secs) => n + Object.keys(secs).length, 0);
  const customCount = Object.keys(pages).length;
  const pageGroups = [...new Set(PAGE_TEXT_TARGETS.map((t) => t.group))];
  const note = sizeNote(siteSize);

  const setPage = (path, entry) => {
    const next = { ...pages };
    const clean = { ...(entry.size ? { size: entry.size } : {}), ...(entry.font ? { font: entry.font } : {}) };
    if (Object.keys(clean).length) next[path] = clean;
    else delete next[path];
    set(APPEARANCE_KEYS.pages, JSON.stringify(next));
  };

  const setSection = (path, id, entry) => {
    const next = JSON.parse(JSON.stringify(sectionSettings));
    const clean = { ...(entry.size ? { size: entry.size } : {}), ...(entry.font ? { font: entry.font } : {}) };
    next[path] = next[path] || {};
    if (Object.keys(clean).length) next[path][id] = clean;
    else delete next[path][id];
    if (!Object.keys(next[path]).length) delete next[path];
    set(APPEARANCE_KEYS.sections, JSON.stringify(next));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const rows = [
        { key: APPEARANCE_KEYS.size, value: String(siteSize), label: "Appearance — text size (px)" },
        { key: APPEARANCE_KEYS.font, value: siteFont, label: "Appearance — font" },
        { key: APPEARANCE_KEYS.color, value: values[APPEARANCE_KEYS.color] ?? "default", label: "Appearance — text colour" },
        { key: APPEARANCE_KEYS.pages, value: JSON.stringify(pages), label: "Appearance — font and size per page" },
        { key: APPEARANCE_KEYS.sections, value: JSON.stringify(sectionSettings), label: "Appearance — font and size per section" },
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
    setValues((prev) => ({
      ...prev,
      [APPEARANCE_KEYS.size]: String(DEFAULT_SIZE),
      [APPEARANCE_KEYS.font]: "default",
      [APPEARANCE_KEYS.color]: "default",
      [APPEARANCE_KEYS.pages]: "{}",
      [APPEARANCE_KEYS.sections]: "{}",
    }));

  if (loading) return <p className="text-rtg-mist text-sm">Loading…</p>;

  return (
    <div className="pb-24">
      <AdminPageHeader
        title="Appearance"
        description="Pick the font and text size for the public site — like in WordPad — for the whole site and, if you want, page by page. The admin panel itself never changes; the preview shows what visitors see."
      />

      {/* Sitewide */}
      <section className="glass mb-6 rounded-3xl p-5 md:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl">
          <Type size={18} className="text-rtg-orange-400" /> Whole site
        </h2>
        <p className="mb-5 max-w-2xl text-xs text-rtg-mist">
          The font and size for body text on every page. Headings keep the RTG display font. Size is in pixels — 16 is the normal web size; text and spacing grow together so layouts keep their shape.
        </p>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">Font</p>
              <FontPicker value={siteFont} onChange={(v) => set(APPEARANCE_KEYS.font, v || "default")} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">Size (px)</p>
              <SizePicker value={String(siteSize)} onChange={(v) => set(APPEARANCE_KEYS.size, v || String(DEFAULT_SIZE))} />
              {note && (
                <p className={`mt-2 inline-flex items-center gap-1.5 text-xs ${siteSize < 12 || siteSize > 20 ? "font-semibold text-amber-800" : "text-rtg-mist"}`}>
                  {(siteSize < 12 || siteSize > 20) && <AlertTriangle size={13} />} {note}
                </p>
              )}
            </div>
          </div>
          <Preview size={siteSize} font={fontByValue(siteFont)} />
        </div>
      </section>

      {/* Per page */}
      <section className="glass mb-6 rounded-3xl p-5 md:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <FileText size={18} className="text-rtg-orange-400" /> Page by page
          </h2>
          <span className="flex items-center gap-3 text-xs text-rtg-mist">
            {customCount + sectionCount === 0
              ? "Every page follows the whole-site choice"
              : `${customCount} page${customCount === 1 ? "" : "s"} · ${sectionCount} section${sectionCount === 1 ? "" : "s"} customised`}
            {customCount + sectionCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  set(APPEARANCE_KEYS.pages, "{}");
                  set(APPEARANCE_KEYS.sections, "{}");
                }}
                className="inline-flex items-center gap-1 font-semibold text-rtg-orange-600 hover:underline"
              >
                <RotateCcw size={12} /> Reset all pages
              </button>
            )}
          </span>
        </div>
        <p className="mb-5 max-w-2xl text-xs text-rtg-mist">
          Give any page its own font and size. "Site default" follows the whole-site choice above ({fontByValue(siteFont).label}, {siteSize}px). A page's
          choice also covers the pages under it — every event's page follows Events. Open <b>Sections</b> on a page to give one part of it (say, the community cards) its own font and size — all its normal text changes, while big display headings keep their designed size so the layout holds. Save, then open the page to see it.
        </p>
        <div className="space-y-6">
          {pageGroups.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rtg-mist">{group}</p>
              <ul className="space-y-2">
                {PAGE_TEXT_TARGETS.filter((t) => t.group === group).map((t) => (
                  <PageRow
                    key={t.path}
                    target={t}
                    entry={pages[t.path] || {}}
                    siteSize={siteSize}
                    siteFont={siteFont}
                    onChange={(e) => setPage(t.path, e)}
                    sections={SECTION_TEXT_TARGETS[t.path] || []}
                    sectionEntries={sectionSettings[t.path] || {}}
                    onSectionChange={(id, e) => setSection(t.path, id, e)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Colour */}
      <section className="glass mb-6 rounded-3xl p-5 md:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl">
          <Palette size={18} className="text-rtg-orange-400" /> Text colour
        </h2>
        <p className="mb-4 max-w-xl text-xs text-rtg-mist">Main and secondary text colours, whole site. All three are checked for contrast against the light background.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEXT_COLORS.map((option) => {
            const selected = color.value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => set(APPEARANCE_KEYS.color, option.value)}
                aria-pressed={selected}
                className={`relative rounded-2xl border p-4 text-left transition-colors ${selected ? "border-rtg-orange-400 bg-rtg-orange-500/10" : "border-rtg-border bg-white hover:border-rtg-orange-400/50"}`}
              >
                {selected && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-rtg-orange-500 text-white">
                    <Check size={12} />
                  </span>
                )}
                <span className="block pr-6 text-sm font-semibold text-rtg-white">{option.label}</span>
                <span className="mt-0.5 block text-xs text-rtg-mist">{option.hint}</span>
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full border border-rtg-border" style={{ background: option.ink }} />
                  <span className="h-5 w-5 rounded-full border border-rtg-border" style={{ background: option.muted }} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Save bar — always in reach */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-rtg-border bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f45b18,#ff8a3d)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(247,107,28,0.9)] disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saved ? "Saved" : "Save changes"}
        </button>
        <button
          onClick={reset}
          className="rounded-full bg-rtg-purple-950/[0.04] px-5 py-2.5 text-sm font-semibold text-rtg-mist transition-colors hover:bg-rtg-purple-950/[0.07] hover:text-rtg-orange-600"
        >
          Reset everything to defaults
        </button>
        {error ? <span className="text-xs text-red-600">{error}</span> : <span className="text-xs text-rtg-mist">Nothing changes on the site until you save.</span>}
      </div>
    </div>
  );
}
