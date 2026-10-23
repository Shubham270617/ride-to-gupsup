import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, UserPlus } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { claimBootstrapAdmin } from "../lib/adminBootstrap";
import { useSiteImages } from "../lib/publicData";

const ERROR_MESSAGES = {
  not_configured: "That sign-in method isn't connected yet — please check back soon.",
  access_denied: "Sign-in was cancelled.",
  invalid_state: "That sign-in link expired or was invalid. Please try again.",
  token_exchange_failed: "We couldn't verify that with the provider. Please try again.",
  no_profile: "We couldn't read your profile from that provider.",
  account_create_failed: "We couldn't create your account. Please try again.",
  profile_save_failed: "We couldn't save your profile. Please try again.",
  session_link_failed: "We couldn't log you in. Please try again.",
  server_misconfigured: "Login isn't fully set up yet — please check back soon.",
  unexpected_error: "Something went wrong. Please try again.",
};

// How long the welcome screen shows before moving on (its progress bar
// fills over the same time; see .rtg-welcome-bar in index.css).
const WELCOME_MS = 1600;

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("working");
  const [noAccountEmail, setNoAccountEmail] = useState("");
  const [adminRefusal, setAdminRefusal] = useState({ reason: "", message: "", email: "" });
  // First name for the welcome screen, when the account has one.
  const [firstName, setFirstName] = useState("");
  const images = useSiteImages();

  const providerError = params.get("error");
  const isAdminFlow = params.get("admin") === "1";
  const intent = params.get("intent"); // "login" | "signup" | null

  useEffect(() => {
    if (providerError) {
      setStatus("error");
      return;
    }
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }

    // supabase-js auto-detects the access/refresh tokens in the URL hash
    // (from the magic-link redirect) and establishes the session — we just
    // need to wait for it, then send the visitor home.
    let cancelled = false;

    const finish = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setStatus("error");
        return;
      }

      // Google OAuth always "succeeds" and silently creates a brand-new
      // account on first use — unlike password login, there's no native way
      // for it to fail on an unregistered email. So: if the person
      // explicitly chose the Log In tab (intent=login) but this sign-in
      // just created their account for the very first time (created_at and
      // last_sign_in_at are the same instant, within a few seconds), treat
      // that as "no account exists" and bounce them to Sign Up instead of
      // silently letting a brand-new account through a Log In button.
      const user = data.session.user;
      setFirstName(String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim().split(/\s+/)[0] || "");
      const isBrandNewAccount =
        user.created_at &&
        user.last_sign_in_at &&
        Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) < 5000;

      if (intent === "login" && isBrandNewAccount) {
        setNoAccountEmail(user.email || "");
        await supabase.auth.signOut();
        setStatus("no_account");
        return;
      }

      // Google sign-in started from /admin/login carries this flag through
      // so the callback (shared with the member popup) knows to check for
      // admin access instead of just dropping them on the homepage.
      if (params.get("admin") === "1") {
        // ?admin=1 is just a hint about where the sign-in started — it is
        // part of a URL anyone can type, so it grants nothing. The server
        // re-decides from the fixed admin email list on every attempt
        // (api/auth/claim-bootstrap-admin.js), which is why there is no
        // client-side admin_profiles lookup here anymore: checking in the
        // browser only ever produced a nicer message, never a boundary.
        const { granted, reason, message } = await claimBootstrapAdmin();
        if (!granted) {
          await supabase.auth.signOut();
          // Keep the server's actual reason: "not an admin email", "email
          // not confirmed" and "the grant itself failed" need different
          // fixes, and one generic message made them impossible to tell apart.
          setAdminRefusal({ reason, message, email: user.email || "" });
          setStatus(reason === "request_failed" ? "server_unreachable" : "not_admin");
          return;
        }
        setStatus("success");
        setTimeout(() => navigate("/admin", { replace: true }), WELCOME_MS);
        return;
      }

      // Any provider (Google, Strava, XFitConnect) can land a brand-new
      // account here with no phone/password/photo yet — send them to
      // finish that on /onboarding instead of straight to the homepage.
      // Returning users who already did this just have the flag set, so
      // they skip straight through.
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", data.session.user.id)
        .maybeSingle();

      setStatus("success");
      const destination = profileRow && !profileRow.onboarding_complete ? "/onboarding" : "/";
      setTimeout(() => navigate(destination, { replace: true }), WELCOME_MS);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") finish();
    });

    finish();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [providerError, navigate]);

  return (
    <div className="rtg-welcome relative isolate min-h-svh flex flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Animated backdrop: drifting glows, faint lines and a slow ring. */}
      <div aria-hidden="true" className="rtg-welcome-bg">
        <span className="rtg-welcome-glow rtg-welcome-glow-a" />
        <span className="rtg-welcome-glow rtg-welcome-glow-b" />
        <span className="rtg-welcome-glow rtg-welcome-glow-c" />
        <span className="rtg-welcome-ring" />
      </div>
      {images.logoNav && <img src={images.logoNav} alt="Ride Tea GupShup" className="rtg-welcome-logo mb-6 h-10 w-auto brightness-0 invert" />}
      <div className="rtg-welcome-card max-w-sm w-full rounded-[2rem] border border-white/40 bg-white/95 px-8 py-11 shadow-[0_40px_100px_-30px_rgba(10,4,24,0.7)] backdrop-blur">
        {status === "working" && (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="text-rtg-mist text-sm">Signing you in…</p>
          </>
        )}
        {status === "success" && (
          <>
            <svg className="rtg-welcome-check mx-auto mb-5" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
              <circle className="rtg-welcome-check-ring" cx="36" cy="36" r="32" />
              <path className="rtg-welcome-check-tick" d="M23 37.5 32 46l17-19" />
            </svg>
            <p className="rtg-welcome-rise font-display text-3xl leading-none mb-2">
              {firstName ? `Welcome back, ${firstName}` : "Welcome to RTG"}
            </p>
            <p className="rtg-welcome-rise rtg-welcome-rise-2 text-rtg-mist text-sm">
              {isAdminFlow ? "Opening the RTG control room…" : "Taking you to the site…"}
            </p>
            <div className="rtg-welcome-rise rtg-welcome-rise-2 mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-rtg-purple-950/10">
              <span className="rtg-welcome-bar block h-full rounded-full bg-gradient-to-r from-[#f45b18] via-[#ff8a3d] to-[#a77bd7]" />
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="font-display text-2xl mb-2">Couldn't sign you in</p>
            <p className="text-rtg-mist text-sm mb-6">
              {ERROR_MESSAGES[providerError] || ERROR_MESSAGES.unexpected_error}
            </p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="inline-flex items-center justify-center rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors"
            >
              Back to RTG
            </button>
          </>
        )}
        {status === "not_admin" && (
          <>
            <AlertCircle className="mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="font-display text-2xl mb-2">
              {adminRefusal.reason === "not_admin_email"
                ? "Not an admin account"
                : adminRefusal.reason === "email_not_confirmed"
                  ? "Confirm your email first"
                  : "Couldn't grant admin access"}
            </p>
            {adminRefusal.email && (
              <p className="mx-auto mb-3 inline-block max-w-full break-all rounded-full bg-rtg-purple-950/5 px-3.5 py-1.5 text-xs font-semibold text-rtg-white">
                {adminRefusal.email}
              </p>
            )}
            <p className="text-rtg-mist text-sm mb-6">
              {adminRefusal.reason === "not_admin_email"
                ? "Only the RTG admin email addresses can open the admin dashboard. Sign in with one of them."
                : adminRefusal.reason === "email_not_confirmed"
                  ? "This is an admin email, but it hasn't been confirmed yet. Use the link Supabase emailed you, then log in again."
                  : `Something went wrong while saving admin access: ${adminRefusal.message || "unknown error"}. Please try again.`}
            </p>
            <button
              onClick={() => navigate("/admin/login", { replace: true })}
              className="inline-flex items-center justify-center rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors"
            >
              Back to Admin Login
            </button>
          </>
        )}
        {status === "server_unreachable" && (
          <>
            <AlertCircle className="mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="font-display text-2xl mb-2">Couldn't verify admin access</p>
            <p className="text-rtg-mist text-sm mb-6">
              We couldn't reach the server to check admin status — this happens when testing on a local dev server
              that isn't running Vercel's functions. Try again on the live site, or run <code>vercel dev</code>{" "}
              locally instead of <code>vite</code>.
            </p>
            <button
              onClick={() => navigate("/admin/login", { replace: true })}
              className="inline-flex items-center justify-center rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors"
            >
              Back to Admin Login
            </button>
          </>
        )}
        {status === "no_account" && (
          <>
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-rtg-purple-600 text-white shadow-[0_14px_28px_-12px_rgba(53,36,111,0.7)]">
              <UserPlus size={24} />
            </span>
            <p className="font-display text-3xl leading-none mb-3">You're new here</p>
            {noAccountEmail && (
              <p className="mx-auto mb-3 inline-block max-w-full break-all rounded-full bg-rtg-purple-950/5 px-3.5 py-1.5 text-xs font-semibold text-rtg-white">
                {noAccountEmail}
              </p>
            )}
            <p className="text-rtg-mist text-sm mb-7">There's no account for this email yet. Go back and choose <b className="text-rtg-white">Sign Up</b> instead of Log In to create one.</p>
            <button
              onClick={() => navigate(isAdminFlow ? "/admin/login" : "/", { replace: true })}
              className="btn-shine inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#f45b18,#ff7a1a)] text-white font-semibold px-6 py-3 text-sm shadow-[0_14px_28px_-12px_rgba(247,107,28,0.7)] hover:-translate-y-0.5 transition"
            >
              {isAdminFlow ? "Back to Admin Login" : "Back to RTG"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
