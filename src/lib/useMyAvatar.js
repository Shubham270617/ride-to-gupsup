import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// The logged-in member's profile photo, for the navbar's account button.
// It is the photo saved on their profile; a member who signed in with
// Google and hasn't uploaded one yet gets their Google photo. Empty string
// when there is neither (the button then shows the plain person icon).

const CHANGED = "rtg-avatar-changed";

// Called by the profile page right after a new photo is saved, so the
// navbar shows it without a reload.
export const announceAvatar = (url) => window.dispatchEvent(new CustomEvent(CHANGED, { detail: url }));

export default function useMyAvatar(user) {
  const [saved, setSaved] = useState({ userId: null, url: "" });
  const userId = user?.id;

  useEffect(() => {
    if (!supabase || !userId) return undefined;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSaved({ userId, url: data?.avatar_url || "" });
      });
    const onChange = (e) => setSaved({ userId, url: e.detail || "" });
    window.addEventListener(CHANGED, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED, onChange);
    };
  }, [userId]);

  if (!userId) return "";
  // A photo loaded for someone else (the previous login) is never shown.
  const own = saved.userId === userId ? saved.url : "";
  return own || user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
}
