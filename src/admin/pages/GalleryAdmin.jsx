import { useEffect, useState } from "react";
import { Upload, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { uploadToCloudinary, deleteFromCloudinary } from "../../lib/cloudinaryUpload";
import useTable from "../useTable";
import { useConfirm } from "../components/ConfirmDialog";
import UploadProgressModal from "../components/UploadProgressModal";

const CATEGORIES = ["Cycling", "Running", "Swimming", "Events", "Volunteers"];
const PAGE_SIZE = 24;

export default function GalleryAdmin() {
  const confirm = useConfirm();
  const { rows, loading, insert, remove } = useTable("gallery_items", { orderBy: "sort_order" });
  const [uploading, setUploading] = useState(false);
  const [progressState, setProgressState] = useState({ fileName: "", index: 0, total: 0, progress: 0 });
  const [error, setError] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [eventSlug, setEventSlug] = useState("");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // If a delete/upload changes the row count and the current page no longer
  // exists (e.g. you were on the last page and it emptied out), snap back
  // to the new last page instead of showing a blank grid.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      let nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order || 0)) + 1 : 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressState({ fileName: file.name, index: i + 1, total: files.length, progress: 0 });
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const { url } = await uploadToCloudinary(file, "gallery", (p) =>
          setProgressState((prev) => ({ ...prev, progress: p }))
        );
        await insert({
          media_url: url,
          media_type: mediaType,
          category,
          event_slug: eventSlug.trim() || null,
          sort_order: nextSort,
          published: true,
        });
        nextSort += 1;
      }
      // New uploads get the highest sort_order, so they land on the last
      // page — jump there so they're visible right away instead of looking
      // like the upload silently did nothing.
      setPage(Math.max(1, Math.ceil((rows.length + files.length) / PAGE_SIZE)));
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({ title: "Delete this gallery item?", message: "This can't be undone." });
    if (!ok) return;
    // Best-effort — if Cloudinary is briefly unreachable, still remove the
    // row rather than leaving a dead photo stuck on the public site.
    await deleteFromCloudinary(row.media_url).catch(() => {});
    await remove(row.id);
  };

  return (
    <div>
      <UploadProgressModal active={uploading} {...progressState} />
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
          <input
            type="text"
            value={eventSlug}
            onChange={(e) => setEventSlug(e.target.value)}
            placeholder="Event slug (optional)"
            title="Matches an Event's URL slug so these photos show on that event's page too"
            className="w-44 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
          />
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {pageRows.map((row) => (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5">
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
