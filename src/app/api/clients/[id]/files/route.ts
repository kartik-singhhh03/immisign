import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ClientFilesService } from '@/features/file-notes/services/client-files.service';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ClientFilesService(ctx.supabase);
  try {
    const files = await service.listClientFiles(ctx.agencyId, params.id);
    return NextResponse.json({ success: true, files });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load client files';
    const status = message === 'Client not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
