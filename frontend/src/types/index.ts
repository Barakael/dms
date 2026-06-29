export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  staff_profile?: StaffProfile;
}

export interface StaffProfile {
  id: number;
  title?: string;
  phone?: string;
  status?: string;
  department_id?: number;
  project_id?: number;
  department?: Department;
  project?: Project;
  user?: User;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  head_user_id?: number;
  staff_count?: number;
  documents_count?: number;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  manager_user_id?: number;
  department_id?: number;
  staff_count?: number;
  documents_count?: number;
}

export interface Folder {
  id: number;
  name: string;
  department_id?: number;
  project_id?: number;
  parent_id?: number;
  children?: Folder[];
  documents_count?: number;
}

export interface DocumentItem {
  id: number;
  title: string;
  description?: string;
  department_id?: number;
  project_id?: number;
  folder_id?: number;
  status: string;
  visibility: string;
  mime_type?: string;
  original_filename?: string;
  file_size: number;
  file_size_human: string;
  expires_at?: string;
  created_at?: string;
  department?: Department;
  project?: Project;
  folder?: Folder;
  uploader?: User;
  permissions?: DocumentPermission[];
  versions?: DocumentVersion[];
  scan_results?: ScanResult[];
  tags?: Tag[];
  is_previewable?: boolean;
}

export interface DocumentPermission {
  id: number;
  permission: string;
  user?: User;
}

export interface DocumentVersion {
  id: number;
  version_number: number;
  original_filename: string;
  file_size: number;
  change_note?: string;
  created_at?: string;
  uploaded_by?: User;
}

export interface ScanResult {
  id: number;
  result: string;
  engine: string;
  details?: string;
  scanned_at?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface AuditLog {
  id: number;
  action: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  user?: User;
  document?: DocumentItem;
}

export interface DashboardStats {
  documents: {
    total: number;
    active: number;
    pending_scan: number;
    quarantined: number;
    archived: number;
  };
  departments: number;
  projects: number;
  notifications_unread: number;
  recent_activity: Array<{
    id: number;
    action: string;
    user_name?: string;
    document_title?: string;
    created_at?: string;
  }>;
}

export interface Paginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
}
