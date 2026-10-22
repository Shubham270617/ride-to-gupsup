import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { rememberFeature } from "../../lib/features";

// An on/off switch for a public part of the site (see src/lib/features.js),
// saved straight to site_settings when flipped.
export default function FeatureSwitch({ settingKey, title, onText, offText }) {
  const [on, setOn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError("Couldn't read this switch. Refresh to try again.");
        setOn(data?.value === "true");
      });
    return () => {
      cancelled = true;
    };
  }, [settingKey]);

  const flip = async () => {
    const next = !on;
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("site_settings")
      .upsert({ key: settingKey, value: next ? "true" : "false", label: title });
    setSaving(false);
    if (err) {
      setError(`Couldn't save: ${err.message}`);
      return;
    }
    rememberFeature(settingKey, next);
    setOn(next);
  };

  return (
    <div className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? "bg-green-500/15 text-green-600" : "bg-rtg-purple-950/[0.06] text-rtg-mist"}`}>
          {on ? <Eye size={17} /> : <EyeOff size={17} />}
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-rtg-mist">{on === null ? "Checking…" : on ? onText : offText}</p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(on)}
        aria-label={title}
        disabled={on === null || saving}
        onClick={flip}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${on ? "bg-green-500" : "bg-rtg-purple-950/20"}`}
      >
        {saving ? (
          <Loader2 size={14} className="mx-auto animate-spin text-white" />
        ) : (
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
        )}
      </button>
    </div>
  );
}
