import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const STAFF_MANAGER_ROLES = ["system_admin", "department_head", "project_manager"] as const;

export function StaffRoute({ children }: { children: React.ReactNode }) {
  const { hasRole } = useAuth();
  const canAccess = STAFF_MANAGER_ROLES.some((role) => hasRole(role));

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
