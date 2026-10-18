import { useEffect } from "react";
import { isSupabaseConfigured } from "./supabaseClient";
import useSession from "./useSession";

// Asks the server to send the welcome email the first time a member is
// signed in. The server (api-lib/welcomeEmail.js) decides everything and
// sends at most once per member; this only avoids asking more than once per
// device. Accounts older than a week are never welcomed, so they skip the
// request entirely.
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;
const doneKey = (userId) => `rtg_welcome_checked_${userId}`;

function markDone(userId) {
  try {
    window.localStorage.setItem(doneKey(userId), "1");
  } catch {
    /* storage blocked — the server still won't send twice */
  }
}

export default function useWelcomeEmail() {
  const { session, user } = useSession();

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !session?.access_token) return;
    try {
      if (window.localStorage.getItem(doneKey(user.id))) return;
    } catch {
      /* fall through and ask */
    }
    if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_MS) {
      markDone(user.id);
      return;
    }

    let cancelled = false;
    fetch("/api/auth/account?op=welcome", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => {
        // Any definite answer (sent, already sent, no mailbox) is final.
        // Errors are left to retry on a later visit.
        if (!cancelled && res.ok) markDone(user.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Re-run per account, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, Boolean(session?.access_token)]);
}
