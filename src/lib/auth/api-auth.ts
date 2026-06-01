import { NextResponse } from 'next/server';
import {
  canAccessBilling,
  canManageTeam,
  canWriteTemplates,
  canWriteRecords,
  canAccessOwnerOnlyPages,
  type DbRole,
} from './db-roles';
import { getSessionProfile, type SessionProfile } from './session';

export async function requireSession(): Promise<
  { profile: SessionProfile } | { response: NextResponse }
> {
  const profile = await getSessionProfile();
  if (!profile) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { profile };
}

export function forbidUnless(
  profile: SessionProfile,
  check: (role: DbRole) => boolean,
  message = 'Forbidden',
): NextResponse | null {
  if (!check(profile.dbRole)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return null;
}

export const guards = {
  billing: (p: SessionProfile) => canAccessBilling(p.dbRole),
  team: (p: SessionProfile) => canManageTeam(p.dbRole),
  templatesWrite: (p: SessionProfile) => canWriteTemplates(p.dbRole),
  recordsWrite: (p: SessionProfile) => canWriteRecords(p.dbRole),
  ownerOnly: (p: SessionProfile) => canAccessOwnerOnlyPages(p.dbRole),
};
