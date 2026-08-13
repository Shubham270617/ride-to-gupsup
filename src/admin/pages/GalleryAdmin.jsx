import { useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { uploadToCloudinary } from "../cloudinaryUpload";
import useTable from "../useTable";
import { useConfirm } from "../components/ConfirmDialog";

const CATEGORIES = ["Cycling", "Running", "Swimming", "Events", "Volunteers"];

export default function GalleryAdmin() {
  const confirm = useConfirm();
  const { rows, loading, insert, remove } = useTable("gallery_items", { orderBy: "sort_order" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      let nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order || 0)) + 1 : 0;
      for (const file of files) {
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const { url } = await uploadToCloudinary(file, "gallery");
        await insert({ media_url: url, media_type: mediaType, category, sort_order: nextSort, published: true });
        nextSort += 1;
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({ title: "Delete this gallery item?", message: "This can't be undone." });
    if (!ok) return;
    await remove(row.id);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl">Gallery</h1>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-rtg-ink">
                {c}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-5 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors cursor-pointer">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {error && <p className="text-rtg-orange-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-rtg-mist text-sm py-10 text-center">No gallery items yet — upload your first photo or video.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {rows.map((row) => (
            <div key={row.id} className="relative group rounded-xl overflow-hidden aspect-square bg-white/5">
              {row.media_type === "video" ? (
                <video src={row.media_url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={row.media_url} alt={row.caption || ""} className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => handleDelete(row)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rtg-ink/80 flex items-center justify-center text-rtg-white opacity-0 group-hover:opacity-100 hover:text-rtg-orange-400 transition-all"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
              <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wide bg-rtg-ink/80 px-2 py-0.5 rounded-full text-rtg-mist">
                {row.category ? `${row.category} · ${row.media_type}` : row.media_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
