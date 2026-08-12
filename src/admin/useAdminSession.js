import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";

// A member session isn't enough to reach /admin — the signed-in user also
// needs a row in admin_profiles (created manually, see supabase/schema.sql).
export default function useAdminSession() {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !isSupabaseConfigured) {
      setProfile(null);
      setChecked(true);
      return;
    }
    let cancelled = false;
    supabase
      .from("admin_profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data || null);
        setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, sessionLoading]);

  return {
    user,
    isAdmin: Boolean(profile),
    adminName: profile?.full_name,
    loading: sessionLoading || !checked,
  };
}
