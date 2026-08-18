import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, User, Loader2, Zap, Calendar, ArrowRight, Phone } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { signInWithPhone } from "../lib/phoneAuth";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useLiveActivity } from "../lib/publicData";
import { brand } from "../data/content";

const SESSION_KEY = "rtg_authgate_shown";
const COUNTRY_CODE = "+91";

const toE164 = (localNumber) => `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;

const GoogleMark = (props) => (
  <svg viewBox="0 0 48 48" width={18} height={18} {...props}>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default function AuthGate() {
  const navigate = useNavigate();
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
  const [method, setMethod] = useState("email"); // "email" | "phone" — login only; signup always collects both

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Purely presentational — the "what's happening" preview shown near the
  // login form. Doesn't touch any auth state or handlers. "Live" is a real
  // data check (a weekly session on today's weekday, or a calendar entry
  // dated today), not a hardcoded label.
  const { todaysSession, todaysCalendarEvent, upcomingEvent, nextCalendarEvent } = useLiveActivity();
  const hasLive = Boolean(todaysSession || todaysCalendarEvent);
  const showNextCalendarEvent = nextCalendarEvent && nextCalendarEvent.title !== upcomingEvent?.title;
  const hasUpcoming = Boolean(upcomingEvent || showNextCalendarEvent);

  const shouldShow = !sessionLoading && !dismissed && !session;

  // Someone clicked Login/Sign Up in the navbar — (re)open the panel on the
  // tab they asked for.
  useEffect(() => {
    if (signal > 0) {
      setDismissed(false);
      setMode(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);

  const resetFields = () => {
    setEmail("");
    setPhone("");
    setPassword("");
    setFullName("");
    setError("");
    setNotice("");
    setMethod("email");
  };

  // Login and signup share these fields (same form, two tabs) — always wipe
  // them on tab switch so a password typed into one tab can never linger,
  // pre-filled, in the other.
  const switchMode = (newMode) => {
    setMode(newMode);
    resetFields();
  };

  // Same reasoning on close (dismiss, or a successful login/signup) — never
  // leave credentials sitting in state for the next time the panel opens.
  useEffect(() => {
    if (!shouldShow) {
      resetFields();
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

  const handleGoogle = async () => {
    setError("");
    if (!isSupabaseConfigured) {
      setError("Login isn't connected yet — check back soon.");
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message || "Couldn't start Google sign-in. Please try again.");
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
      if (mode === "login") {
        const { error: signInError } =
          method === "email"
            ? await supabase.auth.signInWithPassword({ email, password })
            : await signInWithPhone(toE164(phone), password);
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone: toE164(phone) } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // Phone + password are already collected right here on this
          // form, so the only thing /onboarding still needs from them is
          // age + a photo (both optional there).
          navigate("/onboarding");
        } else {
          // Only happens if Supabase's "Confirm email" setting is on —
          // this app doesn't use it, so this is a safety net, not the
          // expected path.
          setNotice("Account created — please log in.");
          switchMode("login");
        }
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

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-full px-4 py-3 text-sm font-semibold bg-white text-rtg-ink hover:bg-white/90 transition-colors mb-5"
            >
              <GoogleMark /> Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-rtg-mist uppercase tracking-wide">or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex glass rounded-full p-1 mb-3">
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

            {mode === "login" && (
              <div className="flex gap-4 mb-5 text-sm justify-center">
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`pb-1 border-b-2 transition-colors ${
                    method === "email" ? "border-rtg-orange-400 text-rtg-white" : "border-transparent text-rtg-mist"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className={`pb-1 border-b-2 transition-colors ${
                    method === "phone" ? "border-rtg-orange-400 text-rtg-white" : "border-transparent text-rtg-mist"
                  }`}
                >
                  Phone Number
                </button>
              </div>
            )}

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

              {(mode === "signup" || method === "phone") && (
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                  <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-rtg-mist">{COUNTRY_CODE}</span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    className="w-full rounded-full bg-white/5 border border-white/10 pl-[4.5rem] pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
                  />
                </div>
              )}

              {(mode === "signup" || method === "email") && (
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
              )}

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

            {(hasLive || hasUpcoming) && (
              <div className="mt-6 pt-5 border-t border-white/10">
                {hasLive && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rtg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rtg-orange-400" />
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-rtg-orange-400 font-semibold">Live Today</span>
                    </div>
                    <div className="space-y-2">
                      {todaysSession && (
                        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-2.5">
                          <span className="w-8 h-8 rounded-full bg-rtg-orange-500/15 flex items-center justify-center shrink-0">
                            <Zap size={14} className="text-rtg-orange-400" />
                          </span>
                          <span className="flex-1 min-w-0 text-left">
                            <span className="block text-[10px] uppercase tracking-wide text-rtg-mist">Today's Ride</span>
                            <span className="block text-sm text-rtg-white truncate">
                              {todaysSession.name}{todaysSession.time ? ` — ${todaysSession.time}` : ""}
                            </span>
                          </span>
                        </div>
                      )}
                      {todaysCalendarEvent && (
                        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-2.5">
                          <span className="w-8 h-8 rounded-full bg-rtg-orange-500/15 flex items-center justify-center shrink-0">
                            <Calendar size={14} className="text-rtg-orange-400" />
                          </span>
                          <span className="flex-1 min-w-0 text-left">
                            <span className="block text-[10px] uppercase tracking-wide text-rtg-mist">Ongoing Event</span>
                            <span className="block text-sm text-rtg-white truncate">{todaysCalendarEvent.title}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {hasUpcoming && (
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-rtg-mist font-semibold mb-2">
                      Upcoming Events
                    </span>
                    <div className="space-y-2 mb-2">
                      {upcomingEvent && (
                        <Link
                          to={`/events/${upcomingEvent.slug || upcomingEvent.id}`}
                          onClick={dismiss}
                          className="flex items-center gap-3 glass rounded-2xl px-4 py-2.5 hover:border-rtg-orange-400/50 transition-colors group"
                        >
                          <span className="flex-1 min-w-0 text-left">
                            <span className="block text-sm text-rtg-white truncate">{upcomingEvent.title}</span>
                            <span className="block text-xs text-rtg-mist">{upcomingEvent.date}</span>
                          </span>
                          <ArrowRight
                            size={14}
                            className="text-rtg-mist group-hover:text-rtg-orange-400 group-hover:translate-x-0.5 transition-all shrink-0"
                          />
                        </Link>
                      )}
                      {showNextCalendarEvent && (
                        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-2.5">
                          <span className="flex-1 min-w-0 text-left">
                            <span className="block text-sm text-rtg-white truncate">{nextCalendarEvent.title}</span>
                            <span className="block text-xs text-rtg-mist">
                              {new Date(nextCalendarEvent.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              {nextCalendarEvent.city ? ` · ${nextCalendarEvent.city}` : ""}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <Link
                      to="/race-calendar"
                      onClick={dismiss}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-rtg-orange-500/15 text-rtg-orange-300 text-xs font-semibold py-2 hover:bg-rtg-orange-500/25 transition-colors"
                    >
                      Register Now <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            )}

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
