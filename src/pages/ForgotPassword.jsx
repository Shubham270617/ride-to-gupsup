import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Loader2, MailCheck, CheckCircle2, LockKeyhole, ArrowRight, RotateCcw, KeyRound } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { requestPasswordReset, checkResetCredential, completePasswordReset } from "../lib/passwordReset";
import AuthScreen from "../components/AuthScreen";
import NewPasswordForm from "../components/NewPasswordForm";
import CodeInput from "../components/CodeInput";

const FIELD =
  "w-full rounded-2xl bg-white border border-rtg-border pl-11 pr-4 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15";

const BUTTON =
  "btn-shine group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm shadow-[0_14px_30px_-12px_rgba(247,107,28,0.8)] hover:bg-rtg-orange-400 transition-colors disabled:opacity-60 disabled:shadow-none";

// Accounts created through Strava/Google OAuth get a synthetic address at
// this domain (see api/auth/[provider]/callback.js) — there is no mailbox
// behind it, so a reset email sent there would vanish silently.
const SYNTHETIC_DOMAIN = "@members.";

const RESEND_SECONDS = 45;

const backLink = (
  <Link to="/" className="text-rtg-orange-600 font-semibold hover:underline">
    Back to the site
  </Link>
);

// Forgot password, all on one page: email → 6-digit code → new password →
// signed in. The same email also carries a link to /reset-password, for
// anyone who'd rather click than type.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("email"); // email | code | password | done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const address = email.trim().toLowerCase();

  const sendCode = async () => {
    setError("");
    if (!isSupabaseConfigured) {
      setError("Login isn't connected yet — check back soon.");
      return;
    }
    if (address.includes(SYNTHETIC_DOMAIN)) {
      setError("That account signs in with Strava or Google, so it has no password to reset. Use the provider button on the login panel instead.");
      return;
    }

    setSubmitting(true);
    const { error: requestError } = await requestPasswordReset(address);
    setSubmitting(false);
    if (requestError) {
      setError(requestError.message);
      if (requestError.retryAfter) setResendIn(requestError.retryAfter);
      return;
    }
    setCode("");
    setStage("code");
    setResendIn(RESEND_SECONDS);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    sendCode();
  };

  const verify = async (value) => {
    setError("");
    setSubmitting(true);
    const { error: checkError } = await checkResetCredential({ email: address, code: value });
    setSubmitting(false);
    if (checkError) {
      setError(checkError.message);
      return;
    }
    setStage("password");
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    verify(code);
  };

  // Checks as soon as the sixth digit lands — no extra tap needed.
  const handleCodeChange = (value) => {
    setCode(value);
    setError("");
    if (value.length === 6 && !submitting) verify(value);
  };

  const handlePassword = async (password) => {
    const { error: resetError } = await completePasswordReset({ email: address, code }, password);
    if (resetError) return resetError.message;
    setStage("done");
    setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
  };

  const startOver = () => {
    setStage("email");
    setCode("");
    setError("");
  };

  if (stage === "done") {
    return (
      <AuthScreen
        step={3}
        icon={CheckCircle2}
        eyebrow="All set"
        title="You're back in"
        subtitle="Your password is updated and you're signed in. Taking you to your dashboard…"
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-rtg-purple-950/[0.07]">
          <div className="h-full w-full origin-left animate-[rtg-grow_1.8s_ease-out_forwards] rounded-full bg-[linear-gradient(90deg,#f45b18,#ff8a3d,#b981d8)]" />
        </div>
      </AuthScreen>
    );
  }

  if (stage === "password") {
    return (
      <AuthScreen
        step={2}
        icon={LockKeyhole}
        eyebrow="Code verified"
        title="Set a new password"
        subtitle={
          <>
            For <strong className="text-rtg-white">{address}</strong>. Pick something you haven't used here before.
          </>
        }
        footer={backLink}
      >
        <NewPasswordForm onSubmit={handlePassword} submitLabel="Update password & sign in" />
      </AuthScreen>
    );
  }

  if (stage === "code") {
    return (
      <AuthScreen
        step={1}
        icon={MailCheck}
        eyebrow="Check your inbox"
        title="Enter your code"
        subtitle={
          <>
            If <strong className="text-rtg-white">{address}</strong> has an RTG account, it now has a 6-digit code and
            a reset link. Type the code, or just tap the link in the email.
          </>
        }
        footer={backLink}
      >
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <CodeInput value={code} onChange={handleCodeChange} autoFocus disabled={submitting} />

          {error && <p className="text-xs text-rtg-orange-500">{error}</p>}

          <button type="submit" disabled={submitting || code.length !== 6} className={BUTTON}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {submitting ? "Checking…" : "Verify code"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-rtg-purple-950/[0.03] px-4 py-3 text-xs">
          <button
            type="button"
            onClick={sendCode}
            disabled={resendIn > 0 || submitting}
            className="inline-flex items-center gap-1.5 text-rtg-orange-600 font-semibold hover:underline disabled:text-rtg-mist disabled:no-underline"
          >
            <RotateCcw size={13} />
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </button>
          <button type="button" onClick={startOver} className="text-rtg-mist hover:text-rtg-orange-500">
            Use a different email
          </button>
        </div>
        <p className="mt-3 text-xs text-rtg-mist">Nothing after a few minutes? Check spam. Codes expire in 30 minutes.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      step={0}
      icon={Mail}
      eyebrow="Forgot password"
      title="Reset your password"
      subtitle="Enter the email you signed up with. We'll send a 6-digit code and a link — use either one to set a new password."
      footer={backLink}
    >
      <form onSubmit={handleEmailSubmit} className="space-y-3">
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

        <button type="submit" disabled={submitting} className={BUTTON}>
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Sending…" : "Send code"}
          {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
        </button>
      </form>

      <p className="mt-4 text-xs text-rtg-mist leading-relaxed">
        Signed up with Strava or Google? You don't have a password — use that button on the login panel instead.
      </p>
    </AuthScreen>
  );
}
