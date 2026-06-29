import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  data: {
    message: string;
    type: string;
    document_title?: string;
  };
  read_at?: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/v1/notifications")).data,
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/v1/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications: NotificationItem[] = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Notifications</h2>
          <p className="text-sm text-slate-500">Access grants, scan results, and expiry reminders</p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()}>Mark all read</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="p-6 text-slate-500">No notifications.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`px-5 py-4 ${!n.read_at ? "bg-blue-50/50" : ""}`}>
              <p className="text-sm font-medium text-slate-800">{n.data.message}</p>
              <p className="text-xs text-slate-500 mt-1">{formatDateTime(n.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
