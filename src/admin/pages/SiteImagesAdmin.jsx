import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { images as staticImages } from "../../data/images";
import { deleteFromCloudinary } from "../../lib/cloudinaryUpload";
import ImageUploadField from "../components/ImageUploadField";
import { useConfirm } from "../components/ConfirmDialog";

// Every single-image key in images.js (skips `gallery`, which is an array
// managed on the Gallery admin page instead).
const KEYS = Object.keys(staticImages).filter((k) => typeof staticImages[k] === "string");
const PAGE_SIZE = 15;
const isCloudinaryUrl = (url) => typeof url === "string" && url.includes("res.cloudinary.com");

function humanize(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function SiteImagesAdmin() {
  const confirm = useConfirm();
  const [overrides, setOverrides] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(KEYS.length / PAGE_SIZE));
  const pageKeys = KEYS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    const previousUrl = overrides[key];
    setOverrides((prev) => ({ ...prev, [key]: url }));
    await supabase.from("site_images").upsert({ key, url, label: humanize(key) });
    // The old file isn't deleted right away — it's queued and cleared out by
    // a daily cron 2 days later (see supabase/schema.sql), so an admin who
    // replaces a photo by mistake still has a short window to fix it.
    if (previousUrl && isCloudinaryUrl(previousUrl) && previousUrl !== url) {
      await supabase.from("media_pending_deletions").insert({ url: previousUrl });
    }
  };

  const handleSettingChange = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await supabase.from("site_settings").upsert({ key, value, label: humanize(key) });
  };

  const handleDelete = async (key) => {
    const current = overrides[key];
    if (!current) return;
    const ok = await confirm({
      title: `Delete ${humanize(key)} photo?`,
      message: "This removes it from Cloudinary immediately and reverts this slot to the default image.",
    });
    if (!ok) return;
    setError("");
    setDeletingKey(key);
    try {
      if (isCloudinaryUrl(current)) await deleteFromCloudinary(current);
      await supabase.from("site_images").delete().eq("key", key);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(err.message || "Couldn't delete that photo.");
    } finally {
      setDeletingKey(null);
    }
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

          {error && <p className="text-rtg-orange-400 text-sm mb-4">{error}</p>}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pageKeys.map((key) => (
              <div key={key} className="glass rounded-2xl p-5">
                <ImageUploadField
                  label={humanize(key)}
                  value={overrides[key] || staticImages[key]}
                  onChange={(url) => handleChange(key, url)}
                  onDelete={overrides[key] ? () => handleDelete(key) : undefined}
                  deleting={deletingKey === key}
                  folder="site"
                />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-rtg-mist hover:text-rtg-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                    n === page ? "bg-rtg-orange-500 text-rtg-ink" : "glass text-rtg-mist hover:text-rtg-white"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-rtg-mist hover:text-rtg-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
