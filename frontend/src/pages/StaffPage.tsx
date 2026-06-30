import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { Department, Project, StaffProfile } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";

function emptyStaffForm() {
  return {
    name: "",
    email: "",
    password: "",
    title: "",
    phone: "",
    departmentId: "",
    projectId: "",
    role: "staff",
    status: "active",
  };
}

function roleFromMember(member: StaffProfile): string {
  const roles = member.user?.roles ?? [];
  if (roles.includes("department_head")) return "department_head";
  if (roles.includes("project_manager")) return "project_manager";
  return "staff";
}

export default function StaffPage() {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole("system_admin");
  const isDeptHead = hasRole("department_head");
  const isProjectManager = hasRole("project_manager");
  const canManageStaff = hasRole("system_admin", "department_head", "project_manager");
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState(emptyStaffForm());
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const { data: departments } = useQuery<Department[]>({
    queryKey: [isAdmin ? "departments" : "departments-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/departments" : "/v1/departments/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
    enabled: canManageStaff,
  });

  const headedDepartments = useMemo(() => {
    if (!isDeptHead) return [];
    return (departments ?? []).filter((d) => d.head_user_id === user?.id);
  }, [departments, isDeptHead, user?.id]);

  const { data: projects } = useQuery<Project[]>({
    queryKey: [isAdmin ? "projects" : "projects-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/projects" : "/v1/projects/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
    enabled: canManageStaff && (isAdmin || isProjectManager) && (modalOpen || isProjectManager),
  });

  const managedProjects = useMemo(() => {
    if (isAdmin) return projects ?? [];
    return (projects ?? []).filter((p) => p.manager_user_id === user?.id);
  }, [projects, isAdmin, user?.id]);

  useEffect(() => {
    if (isDeptHead && headedDepartments.length === 1 && !departmentFilter) {
      setDepartmentFilter(String(headedDepartments[0].id));
    }
  }, [isDeptHead, headedDepartments, departmentFilter]);

  useEffect(() => {
    if (isProjectManager && !isDeptHead && managedProjects.length === 1 && !projectFilter) {
      setProjectFilter(String(managedProjects[0].id));
    }
  }, [isProjectManager, isDeptHead, managedProjects, projectFilter]);

  const { data: staff, isLoading } = useQuery<StaffProfile[]>({
    queryKey: ["staff", departmentFilter, projectFilter],
    queryFn: async () => {
      const res = await api.get("/v1/staff", {
        params: {
          department_id: departmentFilter || undefined,
          project_id: projectFilter || undefined,
        },
      });
      return res.data.data ?? res.data;
    },
    enabled: canManageStaff,
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    setForm(emptyStaffForm());
  };

  const openCreate = () => {
    setEditingMember(null);
    setForm({
      ...emptyStaffForm(),
      departmentId: isDeptHead && headedDepartments.length === 1 ? String(headedDepartments[0].id) : "",
      projectId: isProjectManager && !isDeptHead && managedProjects.length === 1 ? String(managedProjects[0].id) : "",
    });
    setModalOpen(true);
  };

  const openEdit = (member: StaffProfile) => {
    setEditingMember(member);
    setForm({
      name: member.user?.name ?? "",
      email: member.user?.email ?? "",
      password: "",
      title: member.title ?? "",
      phone: member.phone ?? "",
      departmentId: member.department_id ? String(member.department_id) : "",
      projectId: member.project_id ? String(member.project_id) : "",
      role: roleFromMember(member),
      status: member.status ?? "active",
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        email: form.email,
        title: form.title || undefined,
        phone: form.phone || undefined,
        department_id: form.departmentId ? Number(form.departmentId) : null,
        project_id: form.projectId ? Number(form.projectId) : null,
        role: form.role,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };

      if (editingMember) {
        return api.patch(`/v1/staff/${editingMember.id}`, payload);
      }

      return api.post("/v1/staff", { ...payload, password: form.password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const deptOptions = isAdmin ? departments : headedDepartments;
  const projectOptions = isAdmin ? projects : managedProjects;

  const subtitle = isDeptHead
    ? headedDepartments.length === 1
      ? `Staff in ${headedDepartments[0].name}`
      : "Staff in your departments"
    : isProjectManager
      ? "Staff in your projects"
      : "All staff members";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Staff</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {canManageStaff && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        )}
      </div>

      {(isAdmin || (isDeptHead && headedDepartments.length > 1)) && (
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">{isAdmin ? "All departments" : "All my departments"}</option>
            {(isAdmin ? departments : headedDepartments)?.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      )}

      {isProjectManager && !isDeptHead && managedProjects.length > 1 && (
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All my projects</option>
            {managedProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : (staff ?? []).length === 0 ? (
          <p className="p-6 text-slate-500">No staff members in this scope.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Department</th>
                {!isDeptHead && <th className="text-left px-5 py-3">Project</th>}
                <th className="text-left px-5 py-3">Status</th>
                {isAdmin && <th className="text-right px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff?.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{member.user?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{member.user?.email ?? "—"}</td>
                  <td className="px-5 py-3">{member.title ?? "—"}</td>
                  <td className="px-5 py-3">{member.department?.name ?? "—"}</td>
                  {!isDeptHead && <td className="px-5 py-3">{member.project?.name ?? "—"}</td>}
                  <td className="px-5 py-3">
                    <Badge variant={member.status === "active" ? "success" : "default"}>{member.status}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={member.user?.id === user?.id}
                          onClick={() => {
                            if (window.confirm(`Delete staff member "${member.user?.name}"?`)) {
                              deleteMutation.mutate(member.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingMember ? "Edit Staff" : "Add Staff"}>
        <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input
          type="password"
          placeholder={editingMember ? "New password (leave blank to keep)" : "Password (min 8 characters)"}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Input placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {(isAdmin || isDeptHead) && (
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            disabled={isDeptHead && headedDepartments.length === 1}
          >
            <option value="">Department (optional)</option>
            {deptOptions?.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        )}
        {(isAdmin || (isProjectManager && !isDeptHead)) && (
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Project (optional)</option>
            {projectOptions?.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        )}
        {isAdmin ? (
          <>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="department_head">Department Head</option>
              <option value="project_manager">Project Manager</option>
            </select>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        ) : (
          <input type="hidden" value="staff" readOnly />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending
              || !form.name
              || !form.email
              || (!editingMember && form.password.length < 8)
              || (isDeptHead && !form.departmentId)
            }
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMember ? "Save" : "Create"}
          </Button>
        </div>
        {saveMutation.isError && <p className="text-sm text-danger">Failed to save staff member.</p>}
      </Modal>
    </div>
  );
}
