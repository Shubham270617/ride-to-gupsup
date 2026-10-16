import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, MailCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import AuthScreen from "../components/AuthScreen";

const FIELD =
  "w-full rounded-2xl bg-white border border-rtg-border pl-11 pr-4 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15";

// Accounts created through Strava/Google OAuth get a synthetic address at
// this domain (see api/auth/[provider]/callback.js) — there is no mailbox
// behind it, so a reset link sent there would vanish silently.
const SYNTHETIC_DOMAIN = "@members.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      setError("Login isn't connected yet — check back soon.");
      return;
    }

    const address = email.trim().toLowerCase();
    if (address.includes(SYNTHETIC_DOMAIN)) {
      setError("That account signs in with Strava or Google, so it has no password to reset. Use the provider button on the login panel instead.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // A "no such user" error is deliberately NOT surfaced — showing it
      // would turn this form into a way to test which addresses have
      // accounts. Only a genuine transport failure is worth reporting.
      if (resetError && !/user|email/i.test(resetError.message || "")) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send the email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthScreen
        eyebrow="Check your inbox"
        title="Reset link sent"
        footer={
          <Link to="/" className="text-rtg-orange-600 font-semibold hover:underline">
            Back to the site
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl bg-rtg-orange-500/10 p-4">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-rtg-orange-600" />
          <p className="text-sm text-rtg-white/80 leading-relaxed">
            If <strong className="text-rtg-white">{email.trim()}</strong> has an RTG account, a link to set a new
            password is on its way. It expires in an hour, and only the most recent link works.
          </p>
        </div>
        <p className="mt-4 text-xs text-rtg-mist">
          Nothing after a few minutes? Check spam, then{" "}
          <button type="button" onClick={() => setSent(false)} className="text-rtg-orange-600 font-semibold hover:underline">
            try again
          </button>
          .
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      eyebrow="Forgot password"
      title="Reset your password"
      footer={
        <Link to="/" className="text-rtg-orange-600 font-semibold hover:underline">
          Back to the site
        </Link>
      }
    >
      <p className="text-sm text-rtg-mist mb-5 leading-relaxed">
        Enter the email address you signed up with and we'll send you a link to set a new one.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className={FIELD}
          />
        </div>

        {error && <p className="text-xs text-rtg-orange-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-shine w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Send reset link
        </button>
      </form>

      <p className="mt-4 text-xs text-rtg-mist">
        Signed up with Strava or Google? You don't have a password — use that button on the login panel instead.
      </p>
    </AuthScreen>
  );
}
