import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { images as staticImages } from "../../data/images";
import ImageUploadField from "../components/ImageUploadField";

// Every single-image key in images.js (skips `gallery`, which is an array
// managed on the Gallery admin page instead).
const KEYS = Object.keys(staticImages).filter((k) => typeof staticImages[k] === "string");

function humanize(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function SiteImagesAdmin() {
  const [overrides, setOverrides] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase.from("site_images").select("key,url"),
      supabase.from("site_settings").select("key,value"),
    ]).then(([imagesRes, settingsRes]) => {
      const map = {};
      (imagesRes.data || []).forEach((r) => {
        map[r.key] = r.url;
      });
      setOverrides(map);
      const settingsMap = {};
      (settingsRes.data || []).forEach((r) => {
        settingsMap[r.key] = r.value;
      });
      setSettings(settingsMap);
      setLoading(false);
    });
  }, []);

  const handleChange = async (key, url) => {
    setOverrides((prev) => ({ ...prev, [key]: url }));
    await supabase.from("site_images").upsert({ key, url, label: humanize(key) });
  };

  const handleSettingChange = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await supabase.from("site_settings").upsert({ key, value, label: humanize(key) });
  };

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Site Photos</h1>
      <p className="text-rtg-mist text-sm mb-8 max-w-2xl">
        Every banner and background image used across the site, in one place. Replace any of them and the
        change goes live immediately — no code, no developer needed.
      </p>

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : (
        <>
          <div className="glass rounded-2xl p-5 mb-8 max-w-md">
            <ImageUploadField
              label="Sponsor Deck (PDF)"
              value={settings.sponsor_deck_url || ""}
              onChange={(url) => handleSettingChange("sponsor_deck_url", url)}
              folder="documents"
              accept="application/pdf"
            />
            <p className="mt-2 text-xs text-rtg-mist">
              Uploaded here becomes the file behind "Download Sponsor Deck" on the Sponsors and Contact pages.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {KEYS.map((key) => (
              <div key={key} className="glass rounded-2xl p-5">
                <ImageUploadField
                  label={humanize(key)}
                  value={overrides[key] || staticImages[key]}
                  onChange={(url) => handleChange(key, url)}
                  folder="site"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
