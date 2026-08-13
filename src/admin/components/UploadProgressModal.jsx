import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud } from "lucide-react";

// Popup progress bar shown during Cloudinary uploads — replaces the old
// silent "Uploading…" button label with a real, live-updating bar so large
// files (especially video) don't look frozen while they transfer.
export default function UploadProgressModal({ active, fileName, index, total, progress }) {
  const pct = Math.round((progress || 0) * 100);
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-rtg-ink/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass rounded-3xl p-6 w-full max-w-sm"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-11 h-11 rounded-full bg-rtg-orange-500/15 flex items-center justify-center mb-4">
              <UploadCloud size={20} className="text-rtg-orange-400" />
            </div>
            <h3 className="font-display text-xl mb-1">Uploading…</h3>
            {total > 1 && (
              <p className="text-xs text-rtg-mist mb-1">
                File {index} of {total}
              </p>
            )}
            {fileName && <p className="text-sm text-rtg-mist truncate mb-4">{fileName}</p>}
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rtg-orange-500 to-rtg-purple-400 rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.15, ease: "linear" }}
              />
            </div>
            <p className="mt-2 text-right text-xs font-mono text-rtg-mist tabular-nums">{pct}%</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
