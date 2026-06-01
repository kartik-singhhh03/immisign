import { NextRequest, NextResponse } from 'next/server';
import { adminRest } from '@/lib/supabase/admin-rest';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { data, error, status } = await adminRest<
    Array<{
      id: string;
      email: string;
      role: string;
      agency_id: string;
      expires_at: string;
      accepted_at: string | null;
    }>
  >(`invitations?token=eq.${encodeURIComponent(params.token)}&select=id,email,role,agency_id,expires_at,accepted_at&limit=1`);

  if (error) {
    return NextResponse.json({ error }, { status: status >= 400 ? status : 500 });
  }

  const row = data?.[0];
  if (!row) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (row.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }

  const agencyRes = await adminRest<Array<{ name: string; slug: string }>>(
    `agencies?id=eq.${row.agency_id}&select=name,slug&limit=1`,
  );
  const agency = agencyRes.data?.[0];

  return NextResponse.json({
    email: row.email,
    role: row.role,
    full_name: null,
    agency_name: agency?.name,
    agency_slug: agency?.slug,
  });
}
