import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAdminSession from "./useAdminSession";

export default function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAdminSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-rtg-ink">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  // This check runs again purely for UX (showing the right message) — it is
  // not the actual security boundary. Every admin table/route is also
  // enforced server-side (Postgres RLS via is_admin(), or an explicit
  // backend check in the relevant api/ function), so someone bypassing this
  // component entirely still can't read or write anything admin-only.
  if (!isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location.pathname, notAuthorized: Boolean(user) }}
        replace
      />
    );
  }

  return children;
}
