import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, User, Loader2, X, Phone } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { signInWithPhone } from "../../lib/phoneAuth";
import { claimBootstrapAdmin } from "../../lib/adminBootstrap";
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
            ? "Account created. Ask an existing admin to grant you access from the Admins screen."
            : "Account created — please log in, then ask an existing admin to grant you access from the Admins screen."
        );
        switchMode("login");
        return;
      }

      const { data, error: signInError } =
        method === "email"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await signInWithPhone(toE164(phone), password);
      if (signInError) throw signInError;

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", (data?.user || userData?.user)?.id)
        .maybeSingle();

      if (!profile) {
        // Only ever succeeds for one of the first 3 people to ever
        // authenticate through /admin/login — see
        // api/auth/claim-bootstrap-admin.js. Everyone after that must be
        // granted access from the Admins screen by an existing admin.
        const { granted, reason } = await claimBootstrapAdmin();
        if (!granted) {
          await supabase.auth.signOut();
          setError(
            reason === "request_failed"
              ? "Couldn't reach the server to check admin status — on a local dev server, run `vercel dev` instead of `vite`, or try this on the live site."
              : "This account isn't authorized as an admin. Ask an existing admin to grant you access."
          );
          return;
        }
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-rtg-ink px-6">
      <div className="relative glass rounded-3xl p-8 md:p-10 w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>
        <img src={images.logo} alt={brand.name} className="h-10 w-auto mx-auto mb-6" />
        <h1 className="font-display text-3xl text-center mb-1">Admin</h1>
        <p className="text-rtg-mist text-sm text-center mb-8">Manage RTG's events, gallery, store, and more.</p>

        {notAuthorized && (
          <div className="mb-5 rounded-2xl border border-rtg-orange-400/30 bg-rtg-orange-400/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-rtg-orange-300">Access Denied</p>
            <p className="text-xs text-rtg-mist mt-1">
              You're signed in, but that account isn't authorized as an admin. Ask an existing admin to grant you
              access from the Admins screen.
            </p>
          </div>
        )}

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
      </div>
    </div>
  );
}
