import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertTriangle, LockKeyhole, ArrowRight } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { checkResetCredential, completePasswordReset } from "../lib/passwordReset";
import AuthScreen from "../components/AuthScreen";
import NewPasswordForm from "../components/NewPasswordForm";

// Where the link in the forgot-password email lands:
// /reset-password?token=… (sent by api-lib/passwordReset.js). The token is
// checked first, so an expired or used link says so up front instead of
// showing a form that fails only after the member has typed a password.
// Setting the password signs them straight in.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !token) {
      setStatus("invalid");
      return;
    }
    let cancelled = false;
    checkResetCredential({ token }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setStatus("invalid");
        return;
      }
      setEmail(data.email || "");
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handlePassword = async (password) => {
    const { error } = await completePasswordReset({ token }, password);
    if (error) return error.message;
    setStatus("done");
    setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
  };

  const backLink = (
    <Link to="/" className="text-rtg-orange-600 font-semibold hover:underline">
      Back to the site
    </Link>
  );

  if (status === "checking") {
    return (
      <AuthScreen step={1} icon={ShieldCheck} eyebrow="One moment" title="Checking your link" subtitle="Making sure this reset link is still valid…">
        <div className="space-y-3" aria-hidden="true">
          <div className="h-12 rounded-2xl bg-rtg-purple-950/[0.05] animate-pulse" />
          <div className="h-12 rounded-2xl bg-rtg-purple-950/[0.05] animate-pulse [animation-delay:150ms]" />
        </div>
      </AuthScreen>
    );
  }

  if (status === "invalid") {
    return (
      <AuthScreen
        icon={AlertTriangle}
        eyebrow="Link expired"
        title="This link no longer works"
        subtitle="Reset links expire after 30 minutes and work only once — and only the newest email's link is valid. Ask for a fresh one and you'll be back in a minute."
        footer={backLink}
      >
        <Link
          to="/forgot-password"
          className="btn-shine group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm shadow-[0_14px_30px_-12px_rgba(247,107,28,0.8)] hover:bg-rtg-orange-400 transition-colors"
        >
          Send me a new code
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </AuthScreen>
    );
  }

  if (status === "done") {
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

  return (
    <AuthScreen
      step={2}
      icon={LockKeyhole}
      eyebrow="Link verified"
      title="Set a new password"
      subtitle={
        email ? (
          <>
            For <strong className="text-rtg-white">{email}</strong>. Pick something you haven't used here before.
          </>
        ) : (
          "Pick something you haven't used here before."
        )
      }
      footer={backLink}
    >
      <NewPasswordForm onSubmit={handlePassword} submitLabel="Update password & sign in" />
    </AuthScreen>
  );
}
