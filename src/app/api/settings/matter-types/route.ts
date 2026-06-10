import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MatterTypesRepository } from '@/lib/supabase/repositories';

async function resolveAgencyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };
  const { data: row, error } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single();
  if (error || !row?.agency_id) return { error: 'Agency not found', status: 400 as const };
  return { agencyId: row.agency_id as string };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await resolveAgencyId(supabase);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === '1';
    const repo = new MatterTypesRepository(supabase);
    const rows = await repo.listAll(ctx.agencyId, includeArchived);
    return NextResponse.json({ matterTypes: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load matter types';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await resolveAgencyId(supabase);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const repo = new MatterTypesRepository(supabase);
    const created = await repo.create(ctx.agencyId, name);

    if (body.subclass_placeholder || body.show_secondary_applicant != null) {
      await repo.updateMatterTypeFlags(created.id, {
        subclass_placeholder: body.subclass_placeholder || undefined,
        show_secondary_applicant: Boolean(body.show_secondary_applicant),
        show_sponsor: Boolean(body.show_sponsor),
        show_dependants: Boolean(body.show_dependants),
      });
    }

    const refreshed = await repo.list(ctx.agencyId);
    const row = refreshed.find((r: { id: string }) => r.id === created.id) || created;
    return NextResponse.json({ matterType: row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create matter type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
