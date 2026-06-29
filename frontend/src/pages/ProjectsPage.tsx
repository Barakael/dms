import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, FolderKanban, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import type { Department, Project, StaffProfile } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";

export default function ProjectsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("system_admin");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [managerUserId, setManagerUserId] = useState("");

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: [isAdmin ? "projects" : "projects-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/projects" : "/v1/projects/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/v1/departments")).data.data ?? (await api.get("/v1/departments")).data,
    enabled: isAdmin && createOpen,
  });

  const { data: staff } = useQuery<StaffProfile[]>({
    queryKey: ["staff"],
    queryFn: async () => (await api.get("/v1/staff")).data.data ?? (await api.get("/v1/staff")).data,
    enabled: isAdmin && createOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/v1/projects", {
        name,
        code,
        description: description || undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        manager_user_id: managerUserId ? Number(managerUserId) : undefined,
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setCreateOpen(false);
      setName("");
      setCode("");
      setDescription("");
      setDepartmentId("");
      setManagerUserId("");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Projects</h2>
          <p className="text-sm text-slate-500">Project manager document spaces</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link
              key={project.id}
              to={`/documents?project_id=${project.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-indigo-600" />
                </div>
                <Badge variant="info">{project.code}</Badge>
              </div>
              <h3 className="font-semibold text-navy-deep mt-4">{project.name}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
              <div className="flex gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {project.documents_count ?? 0} docs</span>
                <span>{project.staff_count ?? 0} staff</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Project">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Code (e.g. PRJ1)" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Department (optional)</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={managerUserId}
          onChange={(e) => setManagerUserId(e.target.value)}
        >
          <option value="">Project manager (optional)</option>
          {staff?.map((member) => (
            <option key={member.user?.id} value={member.user?.id}>{member.user?.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name || !code}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </div>
        {createMutation.isError && <p className="text-sm text-danger">Failed to create project.</p>}
      </Modal>
    </div>
  );
}
