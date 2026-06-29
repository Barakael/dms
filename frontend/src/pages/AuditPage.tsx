import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AuditLog } from "@/types";
import { formatDateTime } from "@/lib/utils";

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get("/v1/audit-logs")).data.data ?? (await api.get("/v1/audit-logs")).data,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-deep">Audit Log</h2>
        <p className="text-sm text-slate-500">Track document views, downloads, and access changes</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Document</th>
                <th className="text-left px-5 py-3">IP</th>
                <th className="text-left px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{log.action}</td>
                  <td className="px-5 py-3">{log.user?.name ?? "—"}</td>
                  <td className="px-5 py-3">{log.document?.title ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{log.ip_address ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
