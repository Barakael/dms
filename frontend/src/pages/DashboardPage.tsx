import { useQuery } from "@tanstack/react-query";
import { FileText, Building2, FolderKanban, AlertTriangle, Clock } from "lucide-react";
import api from "@/lib/api";
import type { DashboardStats } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-navy-deep mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent ?? "bg-blue-50 text-brand-blue"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { hasRole, user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/v1/dashboard/stats")).data,
  });

  if (isLoading) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-deep">Welcome back, {user?.name?.split(" ")[0]}</h2>
        <p className="text-slate-500 text-sm mt-1">Overview of your documents and recent activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={stats?.documents.total ?? 0} icon={FileText} />
        <StatCard label="Active" value={stats?.documents.active ?? 0} icon={FileText} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Pending Scan" value={stats?.documents.pending_scan ?? 0} icon={Clock} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Quarantined" value={stats?.documents.quarantined ?? 0} icon={AlertTriangle} accent="bg-red-50 text-danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {hasRole("system_admin", "department_head", "staff") && (
          <StatCard label="Departments" value={stats?.departments ?? 0} icon={Building2} />
        )}
        {hasRole("system_admin", "project_manager", "staff") && (
          <StatCard label="Projects" value={stats?.projects ?? 0} icon={FolderKanban} />
        )}
        <StatCard label="Unread Notifications" value={stats?.notifications_unread ?? 0} icon={AlertTriangle} accent="bg-red-50 text-danger" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-navy-deep">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {(stats?.recent_activity ?? []).length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No recent activity.</p>
          ) : (
            stats?.recent_activity.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">{item.action.replace(/\./g, " ")}</p>
                  <p className="text-slate-500">{item.document_title ?? "—"} by {item.user_name ?? "System"}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
