import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import type { DeletionRequest } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";
import { useState } from "react";

export default function PendingDeletesPage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: requests, isLoading } = useQuery<DeletionRequest[]>({
    queryKey: ["deletion-requests", "pending"],
    queryFn: async () => {
      const res = await api.get("/v1/deletion-requests", { params: { status: "pending" } });
      return res.data.data ?? res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/v1/deletion-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, review_note }: { id: number; review_note?: string }) =>
      api.post(`/v1/deletion-requests/${id}/reject`, { review_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      setRejectId(null);
      setRejectNote("");
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-deep">Pending Deletes</h2>
        <p className="text-sm text-slate-500">Review and approve document deletion requests from team members</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-blue" /></div>
        ) : (requests ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-500">No pending deletion requests.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-5 py-3">Document</th>
                <th className="text-left px-5 py-3">Requested by</th>
                <th className="text-left px-5 py-3">Reason</th>
                <th className="text-left px-5 py-3">Requested</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests?.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    {req.document ? (
                      <Link to={`/documents/${req.document.id}`} className="font-medium text-brand-blue hover:underline">
                        {req.document.title}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Document removed</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{req.requester?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{req.reason || "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTime(req.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Delete "${req.document?.title}" permanently?`)) {
                            approveMutation.mutate(req.id);
                          }
                        }}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRejectId(req.id)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={rejectId !== null} onClose={() => { setRejectId(null); setRejectNote(""); }} title="Reject deletion request">
        <Input
          placeholder="Optional note for requester"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setRejectId(null); setRejectNote(""); }}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, review_note: rejectNote || undefined })}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject request"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
