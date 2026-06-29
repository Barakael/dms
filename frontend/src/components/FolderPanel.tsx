import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import api from "@/lib/api";
import type { Folder } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

export function FolderPanel({
  departmentId,
  projectId,
}: {
  departmentId?: string;
  projectId?: string;
}) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["folders", departmentId, projectId],
    queryFn: async () => {
      const res = await api.get("/v1/folders", {
        params: {
          department_id: departmentId || undefined,
          project_id: projectId || undefined,
        },
      });
      return res.data.data ?? res.data;
    },
    enabled: !!(departmentId || projectId),
  });

  const createFolder = useMutation({
    mutationFn: () =>
      api.post("/v1/folders", {
        name,
        department_id: departmentId || undefined,
        project_id: projectId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", departmentId, projectId] });
      setName("");
    },
  });

  if (!departmentId && !projectId) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-navy-deep mb-3">Folders</h3>
      <div className="flex gap-2 mb-3">
        <Input placeholder="New folder name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => createFolder.mutate()} disabled={!name}>
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {folders?.map((folder) => (
          <span key={folder.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            {folder.name} ({folder.documents_count ?? 0})
          </span>
        ))}
        {(folders ?? []).length === 0 && <p className="text-sm text-slate-500">No folders yet.</p>}
      </div>
    </div>
  );
}
