import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

// Admin → Members: is Strava pushing new rides to the site the moment
// they're saved (api/webhooks/strava.js)? Shows the state and switches it on
// (api-lib/admin/strava-webhook.js). Even when it's off, new rides still
// arrive when a member opens the site and in the nightly sync — this just
// makes them instant.
async function call(method) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/strava-webhook", {
    method,
    headers: { Authorization: `Bearer ${data?.session?.access_token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || body?.error || `Request failed (${res.status})`);
  return body;
}

export default function StravaLiveUpdates() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (method = "GET") => {
    setBusy(true);
    setError("");
    try {
      setState(await call(method));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const live = state?.live;
  const missing = state?.missing || [];
  const elsewhere = state?.subscription && !live;

  return (
    <div className="glass rounded-2xl p-5 mb-8 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="font-display text-xl flex items-center gap-2">
          <Activity size={17} className="text-rtg-orange-400" /> Strava live updates
        </h2>
        {state && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${live ? "text-green-600" : "text-rtg-orange-600"}`}>
            {live ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {live ? "On" : "Off"}
          </span>
        )}
      </div>
      <p className="text-rtg-mist text-xs mb-4">
        {live
          ? "New, edited and deleted Strava activities reach the site within seconds — no Resync needed."
          : "When this is on, Strava sends every new ride to the site within seconds. Until then, new rides still arrive when the member opens the site, and in the nightly sync."}
      </p>

      {!state && busy && (
        <p className="text-sm text-rtg-mist inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Checking with Strava…
        </p>
      )}

      {missing.length > 0 && (
        <p className="mb-3 rounded-xl border border-rtg-orange-400/30 bg-rtg-orange-400/10 px-4 py-3 text-xs text-rtg-white">
          Add {missing.join(", ")} in Vercel → Project → Settings → Environment Variables, redeploy, then come back here.
          {missing.includes("STRAVA_WEBHOOK_VERIFY_TOKEN") && " The verify token can be any long random text you make up."}
        </p>
      )}

      {elsewhere && (
        <p className="mb-3 text-xs text-rtg-mist break-all">
          Strava is currently sending updates to {state.subscription.callbackUrl}, not to this site ({state.callbackUrl}).
        </p>
      )}

      {state && missing.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {!live && (
            <button
              type="button"
              onClick={() => load("POST")}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rtg-orange-400 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} Turn on live updates
            </button>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-rtg-purple-950/[0.05] px-4 py-2 text-sm font-semibold text-rtg-mist hover:text-rtg-orange-600 disabled:opacity-60"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Check again
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
