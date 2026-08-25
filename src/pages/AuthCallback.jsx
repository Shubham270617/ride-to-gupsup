import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { claimBootstrapAdmin } from "../lib/adminBootstrap";

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

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("working");
  const [noAccountEmail, setNoAccountEmail] = useState("");

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
        const { data: adminRow } = await supabase
          .from("admin_profiles")
          .select("id")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (!adminRow) {
          // Only ever succeeds for one of the first 3 people to ever
          // authenticate through /admin/login — see
          // api/auth/claim-bootstrap-admin.js.
          const { granted, reason } = await claimBootstrapAdmin();
          if (!granted) {
            await supabase.auth.signOut();
            setStatus(reason === "request_failed" ? "server_unreachable" : "not_admin");
            return;
          }
        }
        setStatus("success");
        setTimeout(() => navigate("/admin", { replace: true }), 900);
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
      setTimeout(() => navigate(destination, { replace: true }), 900);
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
    <div className="min-h-svh flex items-center justify-center bg-rtg-ink px-6 text-center">
      <div className="glass rounded-3xl px-8 py-12 max-w-sm w-full">
        {status === "working" && (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="text-rtg-mist text-sm">Signing you in…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="font-display text-2xl mb-1">Welcome to RTG</p>
            <p className="text-rtg-mist text-sm">Taking you to the site…</p>
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
            <p className="font-display text-2xl mb-2">Not an admin yet</p>
            <p className="text-rtg-mist text-sm mb-6">
              That Google account isn't set up as an admin. Ask an existing admin to grant you access from the
              Admins screen, then try again.
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
            <AlertCircle className="mx-auto mb-4 text-rtg-orange-400" size={32} />
            <p className="font-display text-2xl mb-2">No account found</p>
            <p className="text-rtg-mist text-sm mb-6">
              {noAccountEmail ? <>There's no account for <strong className="text-rtg-white">{noAccountEmail}</strong> yet.</> : "That email isn't registered yet."}{" "}
              Use Sign Up instead of Log In to create one.
            </p>
            <button
              onClick={() => navigate(isAdminFlow ? "/admin/login" : "/", { replace: true })}
              className="inline-flex items-center justify-center rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors"
            >
              {isAdminFlow ? "Back to Admin Login" : "Back to RTG"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
