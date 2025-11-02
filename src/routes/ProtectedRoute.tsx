import { ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Role = "admin" | "accountant" | "user";

interface ProtectedRouteProps {
  children: ReactNode;
  allow?: Role[];
}

const ProtectedRoute = ({ children, allow }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If role is not yet determined, wait instead of redirecting
  if (allow && userRole === null) {
    return null;
  }

  if (allow && userRole && !allow.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;