import { supabase } from "./supabaseClient";

// Confirms whether this account already has admin membership. The server
// performs no grant: signup, login and vacant seats do not confer access.
// This helper only relays the response to the interface.
//
// A refusal arrives as HTTP 403 with a real body, so the old "any non-OK
// response means the server was unreachable" shortcut would have hidden the
// actual reason. Non-OK responses are now parsed, and only a genuine
// network/404 failure reports "request_failed".
//
// Note: /api/* routes only exist on Vercel (production, or `vercel dev`
// locally) — a plain `npm run dev` / `vite` dev server 404s on them, which
// is what "request_failed" distinguishes.
export async function claimBootstrapAdmin() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { granted: false, reason: "no_session" };

  try {
    const res = await fetch("/api/auth/claim-bootstrap-admin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    // A refusal the server actually made — pass it through verbatim.
    if (body && typeof body.granted === "boolean") return body;

    // No usable body: the route genuinely isn't there, or the network failed.
    return { granted: false, reason: "request_failed" };
  } catch {
    return { granted: false, reason: "request_failed" };
  }
}

