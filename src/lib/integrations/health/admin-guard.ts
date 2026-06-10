import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import type { DbRole } from '@/lib/auth/db-roles';

const ADMIN_ROLES: DbRole[] = ['owner', 'admin'];

export async function requireAdminDebugAccess() {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return { error: ctx.error, status: ctx.status } as const;
  }
  if (!ADMIN_ROLES.includes(ctx.dbRole)) {
    return { error: 'Owner or Admin access required', status: 403 } as const;
  }
  return ctx;
}
