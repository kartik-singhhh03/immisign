import type { User } from '@/features/auth/store/authStore';

/** Roles stored in `public.users.role` (Postgres enum `user_role`). */
export type DbRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'agent'
  | 'support'
  | 'viewer'
  | 'reviewer';

export type UiRole = User['role'];

const UI_TO_DB: Record<UiRole, DbRole> = {
  Owner: 'owner',
  Admin: 'admin',
  'Migration Agent': 'agent',
  'Case Manager': 'manager',
  Assistant: 'support',
  'Read-only staff': 'viewer',
};

const DB_TO_UI: Record<DbRole, UiRole> = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Migration Agent',
  manager: 'Case Manager',
  support: 'Assistant',
  viewer: 'Read-only staff',
  reviewer: 'Read-only staff',
};

export function uiRoleToDb(role: string): DbRole {
  if (role in UI_TO_DB) return UI_TO_DB[role as UiRole];
  if (
    role === 'owner' ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'agent' ||
    role === 'support' ||
    role === 'viewer' ||
    role === 'reviewer'
  ) {
    return role as DbRole;
  }
  return 'viewer';
}

export function dbRoleToUi(role: string): UiRole {
  return DB_TO_UI[role as DbRole] ?? 'Read-only staff';
}

export function canAccessBilling(dbRole: DbRole): boolean {
  return dbRole === 'owner' || dbRole === 'admin';
}

export function canManageTeam(dbRole: DbRole): boolean {
  return dbRole === 'owner' || dbRole === 'admin';
}

export function canWriteTemplates(dbRole: DbRole): boolean {
  return ['owner', 'admin', 'manager', 'agent'].includes(dbRole);
}

export function canWriteRecords(dbRole: DbRole): boolean {
  return dbRole !== 'viewer' && dbRole !== 'reviewer';
}

/** Owner-only workspace areas (billing plan / agency ownership). */
export function canAccessOwnerOnlyPages(dbRole: DbRole): boolean {
  return dbRole === 'owner';
}

export function canAccessSettings(dbRole: DbRole): boolean {
  return dbRole !== 'support' && dbRole !== 'viewer' && dbRole !== 'reviewer';
}

/** UI role from auth store → whether settings edits should be disabled. */
export function isSettingsRestrictedForUiRole(uiRole: string | undefined): boolean {
  return !canAccessSettings(uiRoleToDb(uiRole || 'Owner'));
}

/** UI role from auth store → whether billing mutations should be disabled. */
export function isBillingRestrictedForUiRole(uiRole: string | undefined): boolean {
  return !canAccessBilling(uiRoleToDb(uiRole || 'Owner'));
}

export function canManageApprovalsDb(dbRole: DbRole): boolean {
  return ['owner', 'admin', 'manager', 'agent'].includes(dbRole);
}

export function canDeleteApprovalsDb(dbRole: DbRole): boolean {
  return dbRole === 'owner' || dbRole === 'admin';
}

export function canAccessSystemHealth(dbRole: DbRole): boolean {
  return dbRole === 'owner' || dbRole === 'admin';
}
