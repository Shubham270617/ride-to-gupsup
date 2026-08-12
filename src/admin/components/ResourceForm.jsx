import { useState } from "react";
import { Loader2 } from "lucide-react";
import ImageUploadField from "./ImageUploadField";

// Sanitizes any input into a safe URL slug — lowercase, hyphen-separated,
// no stray spaces/typos in casing/punctuation like "enduare -league 2".
export function slugify(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function toEditValue(field, raw) {
  if (field.type === "tags") return Array.isArray(raw) ? raw.join(", ") : raw || "";
  if (field.type === "boolean") return raw ?? field.default ?? false;
  if (field.type === "number") return raw ?? field.default ?? 0;
  return raw ?? field.default ?? "";
}

function toSavedValue(field, editVal, values, slugTouched) {
  if (field.type === "tags") {
    return editVal
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (field.type === "number") return Number(editVal) || 0;
  if (field.type === "boolean") return Boolean(editVal);
  if (field.type === "slug") {
    // If the admin never touched the slug field, derive it fresh from the
    // source field at save time; otherwise sanitize whatever they typed.
    const source = slugTouched[field.name] ? editVal : values[field.from];
    return slugify(source);
  }
  return editVal;
}

export default function ResourceForm({ fields, initialValues = {}, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => {
      v[f.name] = toEditValue(f, initialValues[f.name]);
    });
    return v;
  });
  // Slug fields start "touched" only if the record already had a real slug
  // (editing an existing item) — that protects existing URLs from silently
  // changing when the title is edited. New items auto-derive live until the
  // admin manually edits the slug themselves.
  const [slugTouched, setSlugTouched] = useState(() => {
    const t = {};
    fields.forEach((f) => {
      if (f.type === "slug") t[f.name] = Boolean(initialValues[f.name]);
    });
    return t;
  });
  const [error, setError] = useState("");

  const setField = (name, val) => setValues((prev) => ({ ...prev, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {};
    fields.forEach((f) => {
      payload[f.name] = toSavedValue(f, values[f.name], values, slugTouched);
    });
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  const inputClass =
    "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          {f.type !== "boolean" && f.type !== "image" && (
            <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">{f.label}</label>
          )}

          {f.type === "text" && (
            <input
              type="text"
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name]}
              onChange={(e) => setField(f.name, e.target.value)}
              className={inputClass}
            />
          )}

          {f.type === "textarea" && (
            <textarea
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name]}
              rows={4}
              onChange={(e) => setField(f.name, e.target.value)}
              className={`${inputClass} resize-y`}
            />
          )}

          {f.type === "number" && (
            <>
              <input
                type="number"
                required={f.required}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => setField(f.name, e.target.value)}
                className={inputClass}
              />
              {f.hint && <p className="mt-1.5 text-xs text-rtg-mist">{f.hint}</p>}
            </>
          )}

          {f.type === "tags" && (
            <input
              type="text"
              placeholder={f.placeholder}
              value={values[f.name]}
              onChange={(e) => setField(f.name, e.target.value)}
              className={inputClass}
            />
          )}

          {f.type === "slug" && (
            <>
              <input
                type="text"
                required={f.required}
                placeholder={f.placeholder}
                value={slugTouched[f.name] ? values[f.name] : slugify(values[f.from])}
                onChange={(e) => {
                  setSlugTouched((prev) => ({ ...prev, [f.name]: true }));
                  setField(f.name, e.target.value);
                }}
                className={`${inputClass} font-mono`}
              />
              {f.hint && <p className="mt-1.5 text-xs text-rtg-mist">{f.hint}</p>}
            </>
          )}

          {f.type === "map" && (
            <>
              <input
                type="text"
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => setField(f.name, e.target.value)}
                className={inputClass}
              />
              {f.hint && <p className="mt-1.5 text-xs text-rtg-mist">{f.hint}</p>}
              {values[f.name] && (
                <div className="mt-3 rounded-xl overflow-hidden h-48 border border-white/10">
                  <iframe
                    title={`${f.label} preview`}
                    src={mapEmbedUrl(values[f.name])}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </>
          )}

          {f.type === "boolean" && (
            <label className="flex items-center gap-2.5 text-sm text-rtg-white cursor-pointer">
              <input
                type="checkbox"
                checked={values[f.name]}
                onChange={(e) => setField(f.name, e.target.checked)}
                className="w-4 h-4 accent-rtg-orange-500"
              />
              {f.label}
            </label>
          )}

          {f.type === "image" && (
            <ImageUploadField
              label={f.label}
              value={values[f.name]}
              onChange={(url) => setField(f.name, url)}
              folder={f.folder}
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-rtg-orange-400">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-rtg-mist hover:text-rtg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
