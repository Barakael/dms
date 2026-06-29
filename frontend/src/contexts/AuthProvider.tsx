import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "@/lib/api";
import { AuthContext } from "./AuthContext";
import type { User } from "@/types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("dms_token"));
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data ?? res.data))
      .catch(() => {
        localStorage.removeItem("dms_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(() => {
    const normalizeRoles = (roles: unknown): string[] => {
      if (Array.isArray(roles)) return roles;
      if (roles && typeof roles === "object") return Object.values(roles as Record<string, string>);
      return [];
    };

    const hasRole = (...roles: string[]) => normalizeRoles(user?.roles).some((r) => roles.includes(r));

    const portalLabel = hasRole("department_head")
      ? "Department Portal"
      : hasRole("project_manager")
        ? "Project Portal"
        : hasRole("system_admin")
          ? "Admin Portal"
          : "Staff Portal";

    return {
      user,
      token,
      login: (newToken: string, newUser: User) => {
        localStorage.setItem("dms_token", newToken);
        setToken(newToken);
        setUser(newUser);
      },
      logout: () => {
        api.post("/auth/logout").catch(() => undefined);
        localStorage.removeItem("dms_token");
        setToken(null);
        setUser(null);
      },
      hasRole,
      portalLabel,
    };
  }, [user, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
