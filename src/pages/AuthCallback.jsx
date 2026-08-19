import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

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

  const providerError = params.get("error");

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
          // Up to 3 admin seats auto-fill this way — try to claim one. Only
          // actually promotes this account if fewer than 3 admins exist.
          const { data: claimed } = await supabase.rpc("claim_admin_if_seats_open");
          if (!claimed) {
            await supabase.auth.signOut();
            setStatus("not_admin");
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
      </div>
    </div>
  );
}
