import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Role = "admin" | "accountant" | "user";

interface PermissionGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

const PermissionGate = ({ allow, children, fallback = null }: PermissionGateProps) => {
  const { userRole, loading } = useAuth();

  if (loading) return null;
  if (!userRole) return fallback;
  if (!allow.includes(userRole)) return fallback;

  return <>{children}</>;
};

export default PermissionGate;