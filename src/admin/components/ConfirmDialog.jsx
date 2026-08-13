import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(null);

// Drop-in replacement for window.confirm(), styled to match the rest of the
// admin UI instead of the browser's native "localhost says" box. Usage:
//   const confirm = useConfirm();
//   if (!(await confirm({ message: "Delete this event?" }))) return;
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title = "Are you sure?", message, confirmLabel = "Delete" } = {}) => {
    setState({ title, message, confirmLabel });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (result) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-rtg-ink/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(false)}
          >
            <motion.div
              className="glass rounded-3xl p-6 w-full max-w-sm"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-full bg-rtg-orange-500/15 flex items-center justify-center mb-4">
                <AlertTriangle size={20} className="text-rtg-orange-400" />
              </div>
              <h3 className="font-display text-xl mb-2">{state.title}</h3>
              {state.message && <p className="text-sm text-rtg-mist leading-relaxed mb-6">{state.message}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => close(false)}
                  className="flex-1 rounded-full glass py-2.5 text-sm font-semibold text-rtg-white hover:border-white/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => close(true)}
                  className="flex-1 rounded-full bg-rtg-orange-500 text-rtg-ink py-2.5 text-sm font-semibold hover:bg-rtg-orange-400 transition-colors"
                >
                  {state.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
