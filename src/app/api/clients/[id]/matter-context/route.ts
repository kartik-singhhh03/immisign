import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { buildClientMatterContext } from '@/features/clients/lib/client-matter-context';
import type { ClientFileSource } from '@/features/file-notes/services/client-files.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id: clientId } = await params;
  const fileSource = req.nextUrl.searchParams.get('file_source') as ClientFileSource | null;
  const fileId = req.nextUrl.searchParams.get('file_id');

  try {
    const { data: agency } = await ctx.supabase
      .from('agencies')
      .select('slug')
      .eq('id', ctx.agencyId)
      .single();

    const context = await buildClientMatterContext(
      ctx.supabase,
      ctx.agencyId,
      clientId,
      agency?.slug || 'workspace',
      fileSource && fileId ? { fileSource, fileId } : undefined,
    );

    return NextResponse.json({ success: true, context });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load matter context';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
