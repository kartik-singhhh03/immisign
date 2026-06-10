import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { FileNotesService } from '@/features/file-notes/services/file-notes.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const fileSource = req.nextUrl.searchParams.get('file_source');
  const fileId = req.nextUrl.searchParams.get('file_id');
  if (!fileSource || !fileId) {
    return NextResponse.json(
      { error: 'file_source and file_id are required.' },
      { status: 400 },
    );
  }

  if (fileSource !== 'agreement' && fileSource !== 'application_approval') {
    return NextResponse.json({ error: 'Invalid file_source.' }, { status: 400 });
  }

  const { data: profile } = await ctx.supabase
    .from('users')
    .select('full_name')
    .eq('id', ctx.userId)
    .single();

  const service = new FileNotesService(ctx.supabase);
  try {
    const { buffer, filename } = await service.exportAuditTxt(
      ctx.agencyId,
      params.id,
      profile?.full_name || 'Agent',
      fileSource,
      fileId,
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export failed';
    const status =
      message === 'Client not found' || message === 'File not found for this client'
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
