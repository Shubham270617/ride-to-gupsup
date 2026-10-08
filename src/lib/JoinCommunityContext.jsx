import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import useSession from "./useSession";
import { useAuthGate } from "./AuthGateContext";
import { useSiteSettings, buildHomeJoinCopy } from "./publicData";
import SmartLink from "../components/ui/SmartLink";

// What a "Join Community" button does depends on who clicks it:
//   not logged in            -> the login / sign-up panel first, then carry on
//   logged in, not a member  -> the Community Registration form (/onboarding)
//   already a member         -> a small "you're already part of RTG" window
// A member is someone whose profile says they've joined
// (profiles.community_joined, set when that form is submitted).
//
// The window's wording is in Admin -> Site Content -> Home.

// Remembers that a visitor clicked Join before logging in, so the flow
// carries on once they're signed in — for a few minutes only, so a login
// much later doesn't unexpectedly pick it up.
const INTENT_KEY = "rtg-join-intent";
const INTENT_MINUTES = 15;

const readIntent = () => {
  try {
    const at = Number(sessionStorage.getItem(INTENT_KEY));
    return at > 0 && Date.now() - at < INTENT_MINUTES * 60 * 1000;
  } catch {
    return false;
  }
};
const writeIntent = (on) => {
  try {
    if (on) sessionStorage.setItem(INTENT_KEY, String(Date.now()));
    else sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // Private browsing without storage: the visitor just clicks Join again.
  }
};

const JoinCommunityContext = createContext(() => {});

function AlreadyJoined({ open, copy, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const options = [
    { label: copy.profileLabel, to: copy.profileLink, primary: true },
    { label: copy.eventsLabel, to: copy.eventsLink },
    { label: copy.boardLabel, to: copy.boardLink },
  ].filter((o) => o.label && o.to);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-rtg-purple-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rtg-joined-title"
            className="relative w-full max-w-md rounded-3xl bg-white p-8 md:p-10 text-center shadow-[0_38px_100px_rgba(27,17,48,0.35)]"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button type="button" onClick={onClose} aria-label={copy.closeLabel} className="absolute top-4 right-4 text-rtg-mist hover:text-rtg-orange-500 transition-colors">
              <X size={20} />
            </button>
            <span className="inline-block mb-3 text-[10px] font-bold tracking-[0.2em] uppercase text-rtg-orange-500">{copy.joinedKicker}</span>
            <h2 id="rtg-joined-title" className="font-display text-3xl md:text-4xl leading-[0.95] text-rtg-purple-600">
              {copy.joinedTitle}
            </h2>
            {copy.joinedText && <p className="mt-3 text-sm leading-relaxed text-rtg-mist">{copy.joinedText}</p>}
            <div className="mt-7 grid gap-2.5" onClick={onClose}>
              {options.map((o) => (
                <SmartLink
                  key={o.label}
                  to={o.to}
                  className={`flex items-center justify-center min-h-12 px-5 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase transition-all duration-300 hover:-translate-y-0.5 ${
                    o.primary
                      ? "btn-shine text-white bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] shadow-[0_14px_28px_rgba(247,107,28,0.22)]"
                      : "border border-rtg-border text-rtg-purple-600 hover:border-rtg-orange-400"
                  }`}
                >
                  {o.label}
                </SmartLink>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function JoinCommunityProvider({ children }) {
  const { user } = useSession();
  const { requestLogin } = useAuthGate();
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const copy = useMemo(() => buildHomeJoinCopy(settings), [settings]);
  const [showJoined, setShowJoined] = useState(false);
  const userId = user?.id;

  // Signed in: a member sees the window, anyone else goes to the form.
  const proceed = useCallback(
    async (id) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      // A profile completed before the "joined" column existed counts too.
      if (data?.community_joined || data?.onboarding_complete) setShowJoined(true);
      else navigate("/onboarding?join=1");
    },
    [navigate]
  );

  const join = useCallback(() => {
    if (!isSupabaseConfigured) return;
    if (!userId) {
      writeIntent(true);
      requestLogin("signup");
      return;
    }
    proceed(userId);
  }, [userId, requestLogin, proceed]);

  // Just signed in after clicking Join: carry on from where they left off.
  useEffect(() => {
    if (!userId || !readIntent()) return;
    writeIntent(false);
    proceed(userId);
  }, [userId, proceed]);

  const close = useCallback(() => setShowJoined(false), []);

  return (
    <JoinCommunityContext.Provider value={join}>
      {children}
      <AlreadyJoined open={showJoined} copy={copy} onClose={close} />
    </JoinCommunityContext.Provider>
  );
}

// Returns the function a "Join Community" button calls.
export function useJoinCommunity() {
  return useContext(JoinCommunityContext);
}
