import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import api from "@/lib/api";
import type { Department, Project, StaffProfile } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";

export default function StaffPage() {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole("system_admin");
  const canManageStaff = hasRole("system_admin", "department_head", "project_manager");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState("staff");

  const { data: staff, isLoading } = useQuery<StaffProfile[]>({
    queryKey: ["staff"],
    queryFn: async () => (await api.get("/v1/staff")).data.data ?? (await api.get("/v1/staff")).data,
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: [isAdmin ? "departments" : "departments-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/departments" : "/v1/departments/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
    enabled: canManageStaff && createOpen,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: [isAdmin ? "projects" : "projects-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/projects" : "/v1/projects/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
    enabled: canManageStaff && createOpen,
  });

  const managedDepartments = useMemo(() => {
    if (isAdmin) return departments ?? [];
    return (departments ?? []).filter((d) => d.head_user_id === user?.id);
  }, [departments, isAdmin, user?.id]);

  const managedProjects = useMemo(() => {
    if (isAdmin) return projects ?? [];
    return (projects ?? []).filter((p) => p.manager_user_id === user?.id);
  }, [projects, isAdmin, user?.id]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/v1/staff", {
        name,
        email,
        password,
        title: title || undefined,
        phone: phone || undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        project_id: projectId ? Number(projectId) : undefined,
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setTitle("");
      setPhone("");
      setDepartmentId("");
      setProjectId("");
      setRole("staff");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Staff</h2>
          <p className="text-sm text-slate-500">Team members in your departments and projects</p>
        </div>
        {canManageStaff && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Project</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff?.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{member.user?.name ?? "—"}</td>
                  <td className="px-5 py-3">{member.title ?? "—"}</td>
                  <td className="px-5 py-3">{member.department?.name ?? "—"}</td>
                  <td className="px-5 py-3">{member.project?.name ?? "—"}</td>
                  <td className="px-5 py-3"><Badge variant={member.status === "active" ? "success" : "default"}>{member.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Staff">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Department (optional)</option>
          {(isAdmin ? departments : managedDepartments)?.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Project (optional)</option>
          {(isAdmin ? projects : managedProjects)?.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        {isAdmin ? (
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="staff">Staff</option>
            <option value="department_head">Department Head</option>
            <option value="project_manager">Project Manager</option>
          </select>
        ) : (
          <input type="hidden" value="staff" readOnly />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name || !email || password.length < 8}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </div>
        {createMutation.isError && <p className="text-sm text-danger">Failed to create staff member.</p>}
      </Modal>
    </div>
  );
}
