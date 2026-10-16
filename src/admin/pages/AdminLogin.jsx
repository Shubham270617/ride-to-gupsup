import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, User, Loader2, X, Phone, ShieldCheck, CalendarDays, ShoppingBag, TrendingUp } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { signInWithPhone } from "../../lib/phoneAuth";
import { claimBootstrapAdmin } from "../../lib/adminBootstrap";
import { isRemembered, setRemembered } from "../../lib/authStorage";
import { images } from "../../data/images";
import { brand } from "../../data/content";

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

// What the left-hand panel says the admin is for.
const HIGHLIGHTS = [
  { Icon: CalendarDays, title: "Events and calendar", text: "Publish rides, runs and race days." },
  { Icon: ShoppingBag, title: "Store and orders", text: "Products, payments and memberships." },
  { Icon: TrendingUp, title: "Visitors and members", text: "See who is on the site and who joined." },
];

const FIELD =
  "w-full rounded-2xl bg-white border border-rtg-border pr-4 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const notAuthorized = Boolean(location.state?.notAuthorized);
  const [mode, setMode] = useState("login");
  const [method, setMethod] = useState("email"); // "email" | "phone" — login only

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remember, setRemember] = useState(isRemembered);

  // Same field-carryover fix as the member panel: never let a password
  // typed into one tab linger, pre-filled, in the other.
  const switchMode = (newMode) => {
    setMode(newMode);
    setEmail("");
    setPhone("");
    setPassword("");
    setFullName("");
    setError("");
    setNotice("");
    setMethod("email");
  };

  const handleGoogle = async () => {
    setError("");
    if (!isSupabaseConfigured) {
      setError("The database isn't connected yet.");
      return;
    }
    setRemembered(remember);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?admin=1&intent=${mode}`,
        // Forces Google's account picker every time, even if only one
        // Google session is active in the browser — without this, Google
        // silently reuses whichever account was last used, which is what
        // made it look like the wrong email got "auto-captured".
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) setError(oauthError.message || "Couldn't start Google sign-in. Please try again.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!isSupabaseConfigured) {
      setError("The database isn't connected yet.");
      return;
    }
    setSubmitting(true);
    try {
      setRemembered(remember);
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone: toE164(phone) } },
        });
        if (signUpError) throw signUpError;
        setEmail("");
        setPhone("");
        setPassword("");
        setFullName("");
        setNotice(
          data.session
            ? "Account created. An existing admin must add your email to the admin allowlist before you can sign in here."
            : "Account created — an existing admin must add your email to the admin allowlist before you can sign in here."
        );
        switchMode("login");
        return;
      }

      const { error: signInError } =
        method === "email"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await signInWithPhone(toE164(phone), password);
      if (signInError) throw signInError;

      // The server decides, not this page. api/auth/claim-bootstrap-admin
      // checks the email allowlist and answers with a 403 for anyone who
      // isn't on it — the same answer they would get calling it directly,
      // because signing out here is only a courtesy an attacker would skip.
      // The dashboard itself is protected independently by RLS (is_admin()),
      // so this branch is about showing an honest message, not about keeping
      // anyone out.
      const { granted, reason, message } = await claimBootstrapAdmin();
      if (!granted) {
        await supabase.auth.signOut();
        setError(
          reason === "request_failed"
            ? "Couldn't reach the server to check admin status — on a local dev server, run `vercel dev` instead of `vite`, or try this on the live site."
            : message || "This account is not authorised to access the admin dashboard."
        );
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-rtg-ink lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — brand panel (large screens) */}
      <aside className="theme-night relative isolate hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white bg-[#1b1130]">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${images.homeCTA})` }} />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(150deg,rgba(27,17,48,0.94)_0%,rgba(53,36,111,0.86)_55%,rgba(247,107,28,0.55)_130%)]" />
        <div aria-hidden="true" className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full border border-white/10 shadow-[0_0_0_70px_rgba(255,255,255,0.03),0_0_0_150px_rgba(255,255,255,0.02)]" />

        <div className="inline-flex self-start rounded-2xl bg-white px-4 py-2.5 shadow-lg">
          <img src={images.logoNav} alt={brand.name} className="h-9 w-auto" />
        </div>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-rtg-orange-300">
            <ShieldCheck size={14} /> RTG Control Room
          </p>
          <h2 className="font-display text-6xl xl:text-7xl leading-[0.9]">
            Run the ride.
            <span className="block text-gradient">Behind the scenes.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">Everything members see on the site is managed from here — no code, just the admin.</p>

          <ul className="mt-9 space-y-3 max-w-md">
            {HIGHLIGHTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#f45b18,#ff8a3d)]">
                  <Icon size={18} />
                </span>
                <span>
                  <strong className="block text-sm font-semibold">{title}</strong>
                  <small className="block text-xs text-white/65">{text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/55">Authorised RTG staff only.</p>
      </aside>

      {/* RIGHT — the form */}
      <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-10">
        <div aria-hidden="true" className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-rtg-orange-400/15 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-rtg-purple-600/15 blur-3xl" />

        <div className="relative w-full max-w-md rounded-[2rem] border border-rtg-border bg-white p-7 sm:p-10 shadow-[0_30px_80px_-30px_rgba(53,36,111,0.35)]">
          <span aria-hidden="true" className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,#f45b18,#ff8a3d,#b981d8)]" />
          <button
            onClick={() => navigate("/")}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-orange-500 hover:bg-rtg-purple-950/5 transition-colors"
          >
            <X size={18} />
          </button>

          <img src={images.logoNav} alt={brand.name} className="h-10 w-auto mb-6 lg:hidden" />
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-rtg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rtg-orange-600">
            <ShieldCheck size={12} /> Staff only
          </p>
          <h1 className="font-display text-4xl leading-none mb-2">{mode === "login" ? "Welcome back" : "Create your admin login"}</h1>
          <p className="text-rtg-mist text-sm mb-7">Manage RTG's events, gallery, store, and more.</p>

          {notAuthorized && (
            <div className="mb-6 rounded-2xl border border-rtg-orange-400/30 bg-rtg-orange-400/10 px-4 py-3">
              <p className="text-sm font-semibold text-rtg-orange-600">Access denied</p>
              <p className="text-xs text-rtg-mist mt-1">
                You're signed in, but that account is not on the admin allowlist. An existing admin can add your email from Admin → Members.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-white border border-rtg-border text-rtg-purple-600 shadow-[0_8px_20px_-14px_rgba(53,36,111,0.5)] hover:-translate-y-0.5 hover:border-rtg-purple-600/30 transition mb-5"
          >
            <GoogleMark /> Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-rtg-border" />
            <span className="text-[10px] font-semibold text-rtg-mist uppercase tracking-[0.14em]">or with your details</span>
            <div className="h-px flex-1 bg-rtg-border" />
          </div>

          <div className="flex rounded-2xl bg-rtg-purple-950/5 p-1 mb-4">
            {[
              ["login", "Log In"],
              ["signup", "Sign Up"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  mode === key ? "bg-white text-rtg-purple-600 shadow-sm" : "text-rtg-mist hover:text-rtg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "login" && (
            <div className="flex gap-5 mb-5 text-sm">
              {[
                ["email", "Email"],
                ["phone", "Phone Number"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`pb-1 border-b-2 font-medium transition-colors ${
                    method === key ? "border-rtg-orange-400 text-rtg-white" : "border-transparent text-rtg-mist hover:text-rtg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={`${FIELD} pl-11`} />
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
                  className={`${FIELD} pl-[4.75rem]`}
                />
              </div>
            )}

            {(mode === "signup" || method === "email") && (
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={`${FIELD} pl-11`} />
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
                className={`${FIELD} pl-11`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <label className="inline-flex items-center gap-2 text-xs text-rtg-mist cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-rtg-border accent-rtg-orange-500"
                />
                Remember me
              </label>
              {mode === "login" && (
                <Link to="/forgot-password" className="text-xs text-rtg-mist hover:text-rtg-orange-500 transition-colors">
                  Forgot password?
                </Link>
              )}
            </div>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 text-center">{error}</p>}
            {notice && <p className="rounded-xl bg-rtg-purple-950/5 px-3 py-2 text-xs text-rtg-mist text-center">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-shine w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#f45b18,#ff7a1a)] text-white font-semibold py-3.5 text-sm shadow-[0_14px_28px_-12px_rgba(247,107,28,0.7)] hover:-translate-y-0.5 transition disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-rtg-mist">Only accounts an existing admin has approved can get in.</p>
        </div>
      </main>
    </div>
  );
}
