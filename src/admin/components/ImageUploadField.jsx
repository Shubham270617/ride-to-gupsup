import { useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { uploadToCloudinary } from "../cloudinaryUpload";

export default function ImageUploadField({ label, value, onChange, folder = "uploads", accept = "image/*,video/*" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadToCloudinary(file, folder);
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
      </div>
      {error && <p className="text-xs text-rtg-orange-400 mt-2">{error}</p>}
    </div>
  );
}
