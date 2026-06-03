import type { DbRole } from '@/lib/auth/db-roles';

export function isMfaMandatoryForRole(role: DbRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function userNeedsMfaEnrollment(
  role: DbRole,
  mfaEnabled: boolean,
  hasVerifiedFactor: boolean,
): boolean {
  if (!isMfaMandatoryForRole(role)) return false;
  return !mfaEnabled && !hasVerifiedFactor;
}
