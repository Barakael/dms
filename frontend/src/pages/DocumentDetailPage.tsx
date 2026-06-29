import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, Pencil, RefreshCw, Shield, Trash2, Upload } from "lucide-react";
import api from "@/lib/api";
import type { DocumentItem, User } from "@/types";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  documentCanDelete,
  documentCanRequestDeletion,
  documentCanUpdate,
} from "@/lib/documentPermissions";

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "details";
  const [activeTab, setActiveTab] = useState(tab);
  const [staffUserId, setStaffUserId] = useState("");
  const [preset, setPreset] = useState("");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [requestDeleteOpen, setRequestDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  const { data: document, isLoading } = useQuery<DocumentItem>({
    queryKey: ["document", id],
    queryFn: async () => (await api.get(`/v1/documents/${id}`)).data.data ?? (await api.get(`/v1/documents/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "pending_scan" ? 3000 : false),
  });

  const { data: staff } = useQuery<User[]>({
    queryKey: ["staff-for-access", document?.department_id, document?.project_id],
    queryFn: async () => {
      if (document?.department_id) {
        const res = await api.get(`/v1/departments/${document.department_id}/staff`);
        return (res.data.data ?? res.data).map((s: { user: User }) => s.user);
      }
      if (document?.project_id) {
        const res = await api.get(`/v1/projects/${document.project_id}/staff`);
        return (res.data.data ?? res.data).map((s: { user: User }) => s.user);
      }
      return [];
    },
    enabled: !!document,
  });

  const grantMutation = useMutation({
    mutationFn: () => {
      if (preset) {
        return api.post(`/v1/documents/${id}/permissions`, { preset });
      }
      return api.post(`/v1/documents/${id}/permissions`, {
        user_id: staffUserId,
        permissions: ["view", "download"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      setStaffUserId("");
      setPreset("");
    },
  });

  const versionMutation = useMutation({
    mutationFn: async () => {
      if (!versionFile) throw new Error("No file");
      const form = new FormData();
      form.append("file", versionFile);
      return api.post(`/v1/documents/${id}/versions`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      setVersionFile(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/v1/documents/${id}`, { title: editTitle, description: editDescription }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditOpen(false);
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async () => {
      const file = replaceFileRef.current?.files?.[0];
      if (!file) throw new Error("No file");
      const form = new FormData();
      form.append("file", file);
      return api.post(`/v1/documents/${id}/versions`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setReplaceOpen(false);
      if (replaceFileRef.current) replaceFileRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      window.location.href = "/documents";
    },
  });

  const requestDeleteMutation = useMutation({
    mutationFn: () => api.post(`/v1/documents/${id}/deletion-requests`, { reason: deleteReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      setRequestDeleteOpen(false);
      setDeleteReason("");
      alert("Deletion request submitted for admin approval.");
    },
  });

  const download = async () => {
    const res = await api.get(`/v1/documents/${id}/download`);
    window.open(res.data.url, "_blank");
  };

  const preview = async () => {
    const res = await api.get(`/v1/documents/${id}/preview`);
    window.open(res.data.url, "_blank");
  };

  const openEdit = () => {
    if (!document) return;
    setEditTitle(document.title);
    setEditDescription(document.description ?? "");
    setEditOpen(true);
  };

  if (isLoading || !document) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-blue" /></div>;
  }

  const canManageAccess = hasRole("system_admin", "department_head", "project_manager");
  const canUpdate = documentCanUpdate(document, hasRole, user);
  const canDelete = documentCanDelete(document, hasRole);
  const canRequestDeletion = documentCanRequestDeletion(document, hasRole, user);

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-2 text-sm text-brand-blue hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to documents
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-navy-deep">{document.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{document.description || "No description"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant={statusVariant(document.status)}>{document.status.replace("_", " ")}</Badge>
              {document.department && <Badge>{document.department.name}</Badge>}
              {document.project && <Badge variant="info">{document.project.name}</Badge>}
              {document.tags?.map((tag) => <Badge key={tag.id} variant="default">#{tag.name}</Badge>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {document.is_previewable && document.status === "active" && (
              <Button variant="outline" onClick={preview}>Preview</Button>
            )}
            <Button onClick={download} disabled={document.status !== "active"}>
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
            {canUpdate && (
              <>
                <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                <Button variant="outline" onClick={() => setReplaceOpen(true)}><RefreshCw className="h-4 w-4 mr-1" /> Replace</Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Delete "${document.title}" permanently?`)) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            {canRequestDeletion && (
              <Button variant="danger" onClick={() => setRequestDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Request Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div><p className="text-slate-500">Uploaded by</p><p className="font-medium">{document.uploader?.name}</p></div>
          <div><p className="text-slate-500">File</p><p className="font-medium">{document.original_filename}</p></div>
          <div><p className="text-slate-500">Size</p><p className="font-medium">{document.file_size_human}</p></div>
          <div><p className="text-slate-500">Expires</p><p className="font-medium">{formatDate(document.expires_at)}</p></div>
        </div>

        {document.status === "pending_scan" && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Virus scan in progress...
          </div>
        )}

        {document.status === "quarantined" && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger-dark">
            This document was quarantined. Contact your department head or project manager.
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {["details", "access", "versions", "scan"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === t ? "border-brand-blue text-brand-blue" : "border-transparent text-slate-500"}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "details" && canUpdate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-navy-deep">Edit details</h3>
          <Input value={document.title} readOnly className="bg-slate-50" />
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[100px] bg-slate-50"
            value={document.description ?? ""}
            readOnly
          />
          <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" /> Edit title & description</Button>
        </div>
      )}

      {activeTab === "access" && canManageAccess && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-navy-deep flex items-center gap-2"><Shield className="h-4 w-4" /> Manage Access</h3>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)}>
              <option value="">Select staff member</option>
              {staff?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button onClick={() => grantMutation.mutate()} disabled={!staffUserId && !preset}>Grant access</Button>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="">Access preset</option>
              <option value="all_staff">All staff</option>
              <option value="managers_only">Managers only</option>
            </select>
          </div>
          <div className="divide-y divide-slate-100">
            {document.permissions?.map((perm) => (
              <div key={perm.id} className="py-2 flex justify-between text-sm">
                <span>{perm.user?.name}</span>
                <Badge>{perm.permission}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "versions" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-navy-deep">Version History</h3>
          {canUpdate && (
            <div className="flex gap-2 items-center">
              <Input type="file" onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)} />
              <Button onClick={() => versionMutation.mutate()} disabled={!versionFile || versionMutation.isPending}>
                <Upload className="h-4 w-4 mr-1" /> New version
              </Button>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {document.versions?.map((v) => (
              <div key={v.id} className="py-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium">v{v.version_number} — {v.original_filename}</p>
                  <p className="text-slate-500">{v.change_note || "No note"}</p>
                </div>
                <span className="text-slate-400">{formatDateTime(v.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "scan" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-navy-deep mb-4">Scan Results</h3>
          <div className="space-y-3">
            {document.scan_results?.map((scan) => (
              <div key={scan.id} className="rounded-lg border border-slate-100 p-4 text-sm">
                <div className="flex justify-between">
                  <Badge variant={scan.result === "clean" || scan.result === "skipped" ? "success" : "danger"}>{scan.result}</Badge>
                  <span className="text-slate-400">{formatDateTime(scan.scanned_at)}</span>
                </div>
                <p className="text-slate-600 mt-2">{scan.details || "No details"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit document">
        <Input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[100px]"
          placeholder="Description"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editTitle}>
            {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={replaceOpen} onClose={() => setReplaceOpen(false)} title="Replace document file">
        <p className="text-sm text-slate-500">Upload a new file. A new version will be created and scanned.</p>
        <Input type="file" ref={replaceFileRef} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReplaceOpen(false)}>Cancel</Button>
          <Button onClick={() => replaceMutation.mutate()} disabled={replaceMutation.isPending}>
            {replaceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
          </Button>
        </div>
      </Modal>

      <Modal open={requestDeleteOpen} onClose={() => { setRequestDeleteOpen(false); setDeleteReason(""); }} title="Request deletion">
        <p className="text-sm text-slate-500">Your request will be sent to an administrator for approval.</p>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
          placeholder="Reason (optional)"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setRequestDeleteOpen(false); setDeleteReason(""); }}>Cancel</Button>
          <Button variant="danger" onClick={() => requestDeleteMutation.mutate()} disabled={requestDeleteMutation.isPending}>
            {requestDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
