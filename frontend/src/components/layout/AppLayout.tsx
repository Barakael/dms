import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  FileText,
  Users,
  Shield,
  Bell,
  LogOut,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/staff", label: "Staff", icon: Users, roles: ["system_admin", "department_head", "project_manager"] },
  { to: "/pending-deletes", label: "Pending Deletes", icon: Trash2, roles: ["system_admin"] },
  { to: "/audit", label: "Audit Log", icon: Shield, roles: ["system_admin", "department_head", "project_manager", "auditor"] },
];

export function AppLayout() {
  const { user, logout, portalLabel, hasRole } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/v1/dashboard/stats")).data,
  });

  const { data: pendingDeletes } = useQuery({
    queryKey: ["deletion-requests", "pending"],
    queryFn: async () => {
      const res = await api.get("/v1/deletion-requests", { params: { status: "pending" } });
      return res.data.data ?? res.data;
    },
    enabled: hasRole("system_admin"),
  });

  const pendingDeleteCount = Array.isArray(pendingDeletes) ? pendingDeletes.length : 0;

  const visibleNav = navItems.filter((item) => !item.roles || item.roles.some((r) => hasRole(r)));

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="relative w-64 shrink-0 sidebar-gradient sidebar-texture text-white flex flex-col">
        <div className="relative z-10 p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-blue to-brand-blue-lt flex items-center justify-center shadow-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-wide">Company DMS</p>
              <p className="text-[11px] text-white/60">{portalLabel}</p>
            </div>
          </div>
        </div>

        <nav className="relative z-10 flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/85 transition border border-transparent",
                  isActive ? "nav-active" : "hover:bg-white/10"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("nav-icon flex h-8 w-8 items-center justify-center rounded-lg bg-white/10", isActive && "nav-icon")}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className={cn("nav-label flex items-center gap-2", isActive && "nav-label")}>
                    {item.label}
                    {item.to === "/pending-deletes" && pendingDeleteCount > 0 && (
                      <span className="h-5 min-w-5 px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
                        {pendingDeleteCount}
                      </span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative z-10 p-4 border-t border-white/10 bg-gradient-to-b from-[#457ecd]/20 to-[#22569d]/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white text-navy-deep flex items-center justify-center font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-danger/20 text-white/80 hover:text-red-200" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-navy-deep">Document Management</h1>
            <p className="text-xs text-slate-500">Secure departmental and project documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Bell className="h-5 w-5" />
              {(stats?.notifications_unread ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
                  {stats.notifications_unread}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/documents?upload=1")}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue hover:bg-brand-blue-lt text-white px-4 py-2 text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
