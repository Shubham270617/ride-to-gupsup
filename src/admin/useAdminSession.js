import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";

// A member session isn't enough to reach /admin.
//
// The verdict comes from the database's own is_admin() function, called as
// an RPC — the exact same expression every RLS policy on the site is
// written against (supabase/schema.sql): the account holds one of the 3
// admin_profiles seats. Asking is_admin() rather than reading the row
// directly means the interface and the database always give the same
// answer.
export default function useAdminSession() {
  const { user, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !isSupabaseConfigured) {
      setIsAdmin(false);
      setAdminName(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: allowed, error } = await supabase.rpc("is_admin");
      if (cancelled) return;

      if (error || !allowed) {
        setIsAdmin(false);
        setAdminName(null);
        setChecked(true);
        return;
      }

      // Only now is the name worth fetching — and the read is guaranteed to
      // succeed, because the policy behind it is the check we just passed.
      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      setIsAdmin(true);
      setAdminName(profile?.full_name || null);
      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, sessionLoading]);

  return {
    user,
    isAdmin,
    adminName,
    loading: sessionLoading || !checked,
  };
}
