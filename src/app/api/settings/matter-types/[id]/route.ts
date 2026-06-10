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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await resolveAgencyId(supabase);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const body = await req.json();
    const repo = new MatterTypesRepository(supabase);

    if (body.action === 'archive') {
      const row = await repo.archive(id);
      return NextResponse.json({ matterType: row });
    }
    if (body.action === 'restore') {
      const row = await repo.restore(id);
      return NextResponse.json({ matterType: row });
    }
    if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
      await repo.reorder(ctx.agencyId, body.orderedIds);
      const rows = await repo.listAll(ctx.agencyId, true);
      return NextResponse.json({ matterTypes: rows });
    }

    const flags: Record<string, unknown> = {};
    if (body.name != null) {
      const updated = await repo.updateName(id, String(body.name));
      return NextResponse.json({ matterType: updated });
    }
    if (body.is_active != null) flags.is_active = Boolean(body.is_active);
    if (body.subclass_placeholder != null) flags.subclass_placeholder = body.subclass_placeholder;
    if (body.show_secondary_applicant != null) flags.show_secondary_applicant = Boolean(body.show_secondary_applicant);
    if (body.show_sponsor != null) flags.show_sponsor = Boolean(body.show_sponsor);
    if (body.show_dependants != null) flags.show_dependants = Boolean(body.show_dependants);

    if (Object.keys(flags).length) {
      const row = await repo.updateMatterTypeFlags(id, flags);
      return NextResponse.json({ matterType: row });
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update matter type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await resolveAgencyId(supabase);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const repo = new MatterTypesRepository(supabase);
    await repo.archive(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to archive matter type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
