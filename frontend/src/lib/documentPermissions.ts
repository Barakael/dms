import type { DocumentItem, User } from "@/types";

type HasRole = (...roles: string[]) => boolean;

export function documentCanUpdate(
  doc: DocumentItem,
  hasRole: HasRole,
  user?: User | null
): boolean {
  if (doc.can_update) return true;
  if (hasRole("system_admin", "department_head", "project_manager")) return true;
  if (user?.id && doc.uploader?.id === user.id) return true;
  return false;
}

export function documentCanDelete(doc: DocumentItem, hasRole: HasRole): boolean {
  if (doc.can_delete) return true;
  return hasRole("system_admin");
}

export function documentCanRequestDeletion(
  doc: DocumentItem,
  hasRole: HasRole,
  user?: User | null
): boolean {
  if (doc.can_request_deletion) return true;
  if (hasRole("system_admin")) return false;
  if (hasRole("department_head", "project_manager")) return true;
  if (user?.id && doc.uploader?.id === user.id) return true;
  return false;
}
