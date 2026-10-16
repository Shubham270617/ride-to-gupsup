import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import AuthScreen from "../components/AuthScreen";

const FIELD =
  "w-full rounded-2xl bg-white border border-rtg-border pl-11 pr-12 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15";

const MIN_LENGTH = 8;

// Where the reset email lands. Supabase puts a recovery token in the URL;
// supabase-js picks it up on load (detectSessionInUrl defaults to true) and
// establishes a short-lived session, which is what makes updateUser() below
// allowed to change the password without the old one.
//
// The whole point of the "checking" state is that this takes a moment and
// can fail: an expired or already-used link establishes nothing, and
// without an explicit branch for it the member just sees a form that
// mysteriously refuses to work.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("invalid");
      return;
    }
    let settled = false;

    // Either the session is already there, or it arrives moments later as
    // PASSWORD_RECOVERY once the token in the URL has been exchanged.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data?.session) {
        settled = true;
        setStatus("ready");
      }
    });

    // Nothing turned up — the link was expired, already used, or opened
    // without one.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStatus("invalid");
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus("done");
      // The recovery session is a real session, so there's no reason to
      // bounce them back to a login form — they're already signed in.
      setTimeout(() => navigate("/dashboard", { replace: true }), 1600);
    } catch (err) {
      setError(err.message || "Couldn't update the password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking") {
    return (
      <AuthScreen eyebrow="One moment" title="Checking your link">
        <p className="inline-flex items-center gap-2 text-sm text-rtg-mist">
          <Loader2 size={16} className="animate-spin" /> Verifying…
        </p>
      </AuthScreen>
    );
  }

  if (status === "invalid") {
    return (
      <AuthScreen
        eyebrow="Link expired"
        title="This link no longer works"
        footer={
          <Link to="/" className="text-rtg-orange-600 font-semibold hover:underline">
            Back to the site
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl bg-rtg-orange-500/10 p-4 mb-5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rtg-orange-600" />
          <p className="text-sm text-rtg-white/80 leading-relaxed">
            Reset links expire after an hour and can only be used once. Request a fresh one and it'll work.
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="btn-shine w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm hover:bg-rtg-orange-400 transition-colors"
        >
          Request a new link
        </Link>
      </AuthScreen>
    );
  }

  if (status === "done") {
    return (
      <AuthScreen eyebrow="All set" title="Password updated">
        <p className="inline-flex items-start gap-3 text-sm text-rtg-white/80 leading-relaxed">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-rtg-orange-600" />
          You're signed in with your new password. Taking you to your dashboard…
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen eyebrow="Almost there" title="Set a new password">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
          <input
            type={show ? "text" : "password"}
            required
            autoFocus
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-rtg-mist hover:text-rtg-orange-500 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
          <input
            type={show ? "text" : "password"}
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className={FIELD}
          />
        </div>

        <p className="text-xs text-rtg-mist px-1">At least {MIN_LENGTH} characters.</p>

        {error && <p className="text-xs text-rtg-orange-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-shine w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Update password
        </button>
      </form>
    </AuthScreen>
  );
}
