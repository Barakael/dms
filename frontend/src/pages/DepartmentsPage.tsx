import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import type { Department, StaffProfile } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";

function emptyForm() {
  return { name: "", code: "", description: "", headUserId: "" };
}

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("system_admin");
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: [isAdmin ? "departments" : "departments-mine"],
    queryFn: async () => {
      const endpoint = isAdmin ? "/v1/departments" : "/v1/departments/mine";
      const res = await api.get(endpoint);
      return res.data.data ?? res.data;
    },
  });

  const { data: staff } = useQuery<StaffProfile[]>({
    queryKey: ["staff"],
    queryFn: async () => (await api.get("/v1/staff")).data.data ?? (await api.get("/v1/staff")).data,
    enabled: isAdmin && modalOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["departments-mine"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDept(null);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditingDept(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? "",
      headUserId: dept.head_user_id ? String(dept.head_user_id) : "",
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        head_user_id: form.headUserId ? Number(form.headUserId) : null,
        active: true,
      };
      if (editingDept) {
        return api.patch(`/v1/departments/${editingDept.id}`, payload);
      }
      return api.post("/v1/departments", payload);
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/departments/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Departments</h2>
          <p className="text-sm text-slate-500">Browse documents by department</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Department
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments?.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group flex flex-col"
            >
              <Link to={`/documents?department_id=${dept.id}`} className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition">
                    <Building2 className="h-5 w-5 text-brand-blue group-hover:text-white" />
                  </div>
                  <Badge>{dept.code}</Badge>
                </div>
                <h3 className="font-semibold text-navy-deep mt-4">{dept.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                <div className="flex gap-4 mt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {dept.documents_count ?? 0} docs</span>
                  <span>{dept.staff_count ?? 0} staff</span>
                </div>
              </Link>
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(dept)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (window.confirm(`Delete department "${dept.name}"?`)) {
                        deleteMutation.mutate(dept.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingDept ? "Edit Department" : "Add Department"}>
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Code (e.g. ENG)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={form.headUserId}
          onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
        >
          <option value="">Department head (optional)</option>
          {staff?.map((member) => (
            <option key={member.user?.id} value={member.user?.id}>{member.user?.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.code}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingDept ? "Save" : "Create"}
          </Button>
        </div>
        {saveMutation.isError && <p className="text-sm text-danger">Failed to save department.</p>}
      </Modal>
    </div>
  );
}
