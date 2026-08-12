import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAdminSession from "./useAdminSession";

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAdminSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-rtg-ink">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
