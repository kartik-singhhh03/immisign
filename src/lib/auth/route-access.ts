import {
  canAccessBilling,
  canAccessOwnerOnlyPages,
  canAccessSettings,
  canManageTeam,
  canWriteTemplates,
  type DbRole,
} from './db-roles';

export function canAccessWorkspacePath(dbRole: DbRole, pathKey: string): boolean {
  const segments = pathKey.split('/').filter(Boolean);
  const root = segments[0]?.toLowerCase() || 'dashboard';

  if (root === 'billing' && !canAccessBilling(dbRole)) return false;

  if (root === 'settings') {
    if (!canAccessSettings(dbRole)) return false;
    const section = segments[1]?.toLowerCase();
    if (section === 'payment-schedules' && !canAccessOwnerOnlyPages(dbRole)) return false;
    if (section === 'team' && !canManageTeam(dbRole)) return false;
  }

  if (root === 'templates' && segments.includes('new') && !canWriteTemplates(dbRole)) {
    return false;
  }

  return true;
}
