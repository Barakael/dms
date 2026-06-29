import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, Pencil, RefreshCw, Search, Share2, Trash2, Upload, X } from "lucide-react";
import api from "@/lib/api";
import type { Department, DocumentItem, Project } from "@/types";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { FolderPanel } from "@/components/FolderPanel";
import {
  documentCanDelete,
  documentCanRequestDeletion,
  documentCanUpdate,
} from "@/lib/documentPermissions";

export default function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState(searchParams.get("department_id") ?? "");
  const [projectId, setProjectId] = useState(searchParams.get("project_id") ?? "");
  const [uploadOpen, setUploadOpen] = useState(searchParams.get("upload") === "1");
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [replaceDoc, setReplaceDoc] = useState<DocumentItem | null>(null);
  const [requestDeleteDoc, setRequestDeleteDoc] = useState<DocumentItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  useEffect(() => {
    if (searchParams.get("upload") === "1") setUploadOpen(true);
  }, [searchParams]);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments-mine"],
    queryFn: async () => (await api.get("/v1/departments/mine")).data.data ?? (await api.get("/v1/departments/mine")).data,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects-mine"],
    queryFn: async () => (await api.get("/v1/projects/mine")).data.data ?? (await api.get("/v1/projects/mine")).data,
  });

  const { data: documents, isLoading } = useQuery<DocumentItem[]>({
    queryKey: ["documents", search, departmentId, projectId],
    queryFn: async () => {
      const res = await api.get("/v1/documents", {
        params: {
          search: search || undefined,
          department_id: departmentId || undefined,
          project_id: projectId || undefined,
        },
      });
      return res.data.data ?? res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Select a file");
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name);
      if (departmentId) form.append("department_id", departmentId);
      if (projectId) form.append("project_id", projectId);
      if (expiresAt) form.append("expires_at", expiresAt);
      tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => form.append("tags[]", t));
      return api.post("/v1/documents", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setUploadOpen(false);
      setSearchParams({});
      setTitle("");
      setTags("");
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/v1/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, title: docTitle, description }: { id: number; title: string; description: string }) =>
      api.patch(`/v1/documents/${id}`, { title: docTitle, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditDoc(null);
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async (doc: DocumentItem) => {
      const file = replaceFileRef.current?.files?.[0];
      if (!file) throw new Error("Select a file");
      const form = new FormData();
      form.append("file", file);
      return api.post(`/v1/documents/${doc.id}/versions`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setReplaceDoc(null);
      if (replaceFileRef.current) replaceFileRef.current.value = "";
    },
  });

  const requestDeleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.post(`/v1/documents/${id}/deletion-requests`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      setRequestDeleteDoc(null);
      setDeleteReason("");
      alert("Deletion request submitted for admin approval.");
    },
  });

  const download = async (doc: DocumentItem) => {
    const res = await api.get(`/v1/documents/${doc.id}/download`);
    window.open(res.data.url, "_blank");
  };

  const openEdit = (doc: DocumentItem) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description ?? "");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-deep">Documents</h2>
          <p className="text-sm text-slate-500">Browse and manage shared files</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All departments</option>
          {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {(departmentId || projectId) && (
        <FolderPanel departmentId={departmentId || undefined} projectId={projectId || undefined} />
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-blue" /></div>
        ) : (documents ?? []).length === 0 ? (
          <div className="p-10 text-center text-slate-500">No documents found. Upload your first document.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents?.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div className="min-w-0">
                    <Link to={`/documents/${doc.id}`} className="font-medium text-navy-deep hover:underline truncate block">{doc.title}</Link>
                    <p className="text-xs text-slate-500 truncate">
                      {doc.department?.name ?? doc.project?.name} · {doc.file_size_human} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Badge variant={statusVariant(doc.status)}>{doc.status.replace("_", " ")}</Badge>
                  {doc.department && <Badge>{doc.department.code}</Badge>}
                  {doc.project && <Badge variant="info">{doc.project.code}</Badge>}
                  <Button variant="outline" size="sm" onClick={() => download(doc)} disabled={doc.status !== "active"}><Download className="h-3.5 w-3.5" /></Button>
                  <Link to={`/documents/${doc.id}`}><Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                  {hasRole("system_admin", "department_head", "project_manager") && (
                    <Link to={`/documents/${doc.id}?tab=access`}><Button variant="outline" size="sm"><Share2 className="h-3.5 w-3.5" /></Button></Link>
                  )}
                  {documentCanUpdate(doc, hasRole, user) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(doc)} title="Edit">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setReplaceDoc(doc)} title="Replace file">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Replace
                      </Button>
                    </>
                  )}
                  {documentCanDelete(doc, hasRole) && (
                    <Button
                      variant="danger"
                      size="sm"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete "${doc.title}" permanently?`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                  {documentCanRequestDeletion(doc, hasRole, user) && (
                    <Button variant="danger" size="sm" title="Request delete" onClick={() => setRequestDeleteDoc(doc)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Request
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-navy-deep">Upload Document</h3>
              <button onClick={() => { setUploadOpen(false); setSearchParams({}); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Department</option>
                {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Project</option>
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Input type="file" ref={fileRef} />
            <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || (!departmentId && !projectId)}>
                {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
              </Button>
            </div>
            {uploadMutation.isError && <p className="text-sm text-danger">Upload failed. Select department or project and a file.</p>}
          </div>
        </div>
      )}

      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title="Edit document">
        <Input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[100px]"
          placeholder="Description"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
          <Button
            onClick={() => editDoc && editMutation.mutate({ id: editDoc.id, title: editTitle, description: editDescription })}
            disabled={editMutation.isPending || !editTitle}
          >
            {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!replaceDoc} onClose={() => setReplaceDoc(null)} title="Replace document file">
        <p className="text-sm text-slate-500">Upload a new file to replace &quot;{replaceDoc?.title}&quot;. A new version will be created.</p>
        <Input type="file" ref={replaceFileRef} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReplaceDoc(null)}>Cancel</Button>
          <Button onClick={() => replaceDoc && replaceMutation.mutate(replaceDoc)} disabled={replaceMutation.isPending}>
            {replaceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!requestDeleteDoc} onClose={() => { setRequestDeleteDoc(null); setDeleteReason(""); }} title="Request deletion">
        <p className="text-sm text-slate-500">
          Your request to delete &quot;{requestDeleteDoc?.title}&quot; will be sent to an administrator for approval.
        </p>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
          placeholder="Reason (optional)"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setRequestDeleteDoc(null); setDeleteReason(""); }}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => requestDeleteDoc && requestDeleteMutation.mutate({ id: requestDeleteDoc.id, reason: deleteReason || undefined })}
            disabled={requestDeleteMutation.isPending}
          >
            {requestDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
