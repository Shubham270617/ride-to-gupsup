import { useState } from "react";
import { Upload, Loader2, Check, Trash2 } from "lucide-react";
import { uploadToSupabaseStorage } from "../../lib/supabaseUpload";
import UploadProgressModal from "./UploadProgressModal";

export default function ImageUploadField({
  label,
  value,
  onChange,
  onDelete,
  deleting = false,
  folder = "uploads",
  accept = "image/*,video/*",
  // A regular member uploading their own avatar (Onboarding/Dashboard) —
  // forces the upload into their own "avatars/<user-id>/" folder, the only
  // place a non-admin is allowed to write (see supabase/schema.sql).
  ownAvatar = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    setProgress(0);
    setError("");
    try {
      const { url } = await uploadToSupabaseStorage(file, folder, setProgress, { ownAvatar });
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isVideo = value && /\.(mp4|webm|mov)(\?|$)/i.test(value);

  return (
    <div>
      <UploadProgressModal active={uploading} fileName={fileName} index={1} total={1} progress={progress} />
      {label && <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-2">{label}</label>}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
          {value ? (
            isVideo ? (
              <video src={value} className="w-full h-full object-cover" muted />
            ) : (
              <img src={value} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <Upload size={18} className="text-rtg-mist/50" />
          )}
        </div>
        <label className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold cursor-pointer hover:border-rtg-orange-400/60 transition-colors">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : value ? <Check size={14} /> : <Upload size={14} />}
          {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={uploading || deleting}
            aria-label="Delete photo"
            title="Delete — removes the file and reverts to the default"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full glass text-rtg-mist hover:text-rtg-orange-400 hover:border-rtg-orange-400/60 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rtg-orange-400 mt-2">{error}</p>}
    </div>
  );
}
