import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, User, Loader2, Zap, Calendar, ArrowRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useUpcomingEvent } from "../lib/publicData";
import { brand } from "../data/content";

const SESSION_KEY = "rtg_authgate_shown";

const StravaMark = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} {...props}>
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066M9.395 0L3.638 11.61h3.462L9.6 6.859l2.5 4.751h3.467L9.395 0z" />
  </svg>
);

function ProviderButton({ href, icon: Icon, label, disabled }) {
  if (disabled) {
    return (
      <span className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold border border-white/10 text-rtg-mist/60 cursor-not-allowed">
        <Icon size={18} /> {label}
        <span className="ml-1 text-[10px] uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded-full">Soon</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold glass hover:border-rtg-orange-400/60 hover:text-rtg-orange-300 transition-colors"
    >
      <Icon size={18} /> {label}
    </a>
  );
}

export default function AuthGate() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { session, loading: sessionLoading } = useSession();
  const { signal, initialMode } = useAuthGate();

  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [providerStatus, setProviderStatus] = useState({ strava: true, xfitconnect: false });

  // Purely presentational — the "what's happening" preview shown above the
  // login form. Doesn't touch any auth state or handlers.
  const featuredEvent = useUpcomingEvent();

  const shouldShow = !sessionLoading && !dismissed && !session;

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setProviderStatus(data))
      .catch(() => {
        /* API not reachable (e.g. plain `vite dev` without `vercel dev`) — keep defaults */
      });
  }, []);

  // Someone clicked Login/Sign Up in the navbar — (re)open the panel on the
  // tab they asked for.
  useEffect(() => {
    if (signal > 0) {
      setDismissed(false);
      setMode(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);

  // Login and signup share these fields (same form, two tabs) — always wipe
  // them on tab switch so a password typed into one tab can never linger,
  // pre-filled, in the other.
  const switchMode = (newMode) => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setFullName("");
    setError("");
    setNotice("");
  };

  // Same reasoning on close (dismiss, or a successful login/signup) — never
  // leave credentials sitting in state for the next time the panel opens.
  useEffect(() => {
    if (!shouldShow) {
      setEmail("");
      setPassword("");
      setFullName("");
      setError("");
      setNotice("");
      setMode("login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sessionStorage unavailable — non-fatal */
    }
    setDismissed(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!isSupabaseConfigured) {
      setError("Login isn't connected yet — check back soon.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setEmail("");
          setPassword("");
          setFullName("");
          setNotice("Check your inbox to confirm your email, then log in.");
          setMode("login");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center px-4 py-8 bg-rtg-ink/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <motion.div
            className="glass relative w-full max-w-md rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-orange-400 hover:bg-white/5 transition-colors"
              aria-label="Continue browsing"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs mb-3">
                Welcome to {brand.shortName}
              </span>
              <h2 className="font-display text-3xl md:text-4xl leading-none mb-2">
                Join the <span className="text-gradient">Movement</span>
              </h2>
              <p className="text-rtg-mist text-sm">Log in or create your free RTG account.</p>
            </div>

            {featuredEvent && (
              <Link
                to="/events"
                onClick={dismiss}
                className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mb-5 hover:border-rtg-orange-400/50 transition-colors group"
              >
                <span className="w-9 h-9 rounded-full bg-rtg-orange-500/15 flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-rtg-orange-400" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[10px] uppercase tracking-wide text-rtg-orange-400 font-semibold">
                    Upcoming Event
                  </span>
                  <span className="block text-sm text-rtg-white truncate">
                    {featuredEvent.title} — {featuredEvent.date}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className="text-rtg-mist group-hover:text-rtg-orange-400 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            )}

            <div className="flex gap-2 mb-3">
              <ProviderButton
                href="/api/auth/strava/start"
                icon={StravaMark}
                label="Strava"
                disabled={!providerStatus.strava}
              />
              <ProviderButton
                href="/api/auth/xfitconnect/start"
                icon={Zap}
                label="XFitConnect"
                disabled={!providerStatus.xfitconnect}
              />
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-rtg-mist uppercase tracking-wide">or with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex glass rounded-full p-1 mb-5">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                  mode === "login" ? "bg-rtg-orange-500 text-rtg-ink" : "text-rtg-mist"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
                  mode === "signup" ? "bg-rtg-orange-500 text-rtg-ink" : "text-rtg-mist"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
                  />
                </div>
              )}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
                />
              </div>

              {error && <p className="text-xs text-rtg-orange-400 text-center">{error}</p>}
              {notice && <p className="text-xs text-rtg-mist text-center">{notice}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold py-3 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>

            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-rtg-mist hover:text-rtg-orange-400 mt-5 tracking-wide uppercase transition-colors"
            >
              Continue browsing without an account
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
