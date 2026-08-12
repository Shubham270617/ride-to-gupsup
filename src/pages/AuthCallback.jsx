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
      if (data.session) {
        setStatus("success");
        setTimeout(() => navigate("/", { replace: true }), 900);
      } else {
        setStatus("error");
      }
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
      </div>
    </div>
  );
}
