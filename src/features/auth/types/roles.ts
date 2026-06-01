export enum Role {
  OWNER = "Owner",
  ADMIN = "Admin",
  MIGRATION_AGENT = "Migration Agent",
  CASE_MANAGER = "Case Manager",
  ASSISTANT = "Assistant",
  READ_ONLY = "Read-only staff"
}

export const PermissionsMatrix = {
  [Role.OWNER]: ["*"],
  [Role.ADMIN]: [
    "users:read", "users:write",
    "agreements:read", "agreements:write", "agreements:delete",
    "documents:read", "documents:write", "documents:delete",
    "approvals:read", "approvals:write", "approvals:delete",
    "templates:read", "templates:write", "templates:delete",
    "settings:read", "settings:write",
    "billing:read", "billing:write",
  ],
  [Role.MIGRATION_AGENT]: [
    "agreements:read", "agreements:write",
    "documents:read", "documents:write",
    "approvals:read", "approvals:write",
    "templates:read", "templates:write", "templates:delete",
  ],
  [Role.CASE_MANAGER]: [
    "agreements:read", "agreements:write",
    "documents:read", "documents:write",
    "approvals:read", "approvals:write",
    "templates:read", "templates:write", "templates:delete",
  ],
  [Role.ASSISTANT]: [
    "documents:read", "documents:write",
    "agreements:read",
    "templates:read",
  ],
  [Role.READ_ONLY]: [
    "documents:read",
    "agreements:read",
    "approvals:read",
    "templates:read",
  ],
};

export function hasPermission(role: Role, action: string): boolean {
  const perms = PermissionsMatrix[role];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  return perms.includes(action);
}

export function canView(role: Role, resource: "agreements" | "documents" | "approvals" | "templates" | "billing"): boolean {
  return hasPermission(role, `${resource}:read`);
}

export function canCreate(role: Role, resource: "agreements" | "documents" | "approvals" | "templates" | "billing"): boolean {
  return hasPermission(role, `${resource}:write`);
}

export function canEdit(role: Role, resource: "agreements" | "documents" | "approvals" | "templates" | "billing"): boolean {
  return hasPermission(role, `${resource}:write`);
}

export function canDelete(role: Role, resource: "agreements" | "documents" | "approvals" | "templates" | "billing"): boolean {
  return hasPermission(role, `${resource}:delete`);
}
