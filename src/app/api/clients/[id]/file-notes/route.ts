import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { FileNotesService } from '@/features/file-notes/services/file-notes.service';
import { formatZodError } from '@/lib/validations/fields';
import { fileNoteCreateSchema } from '@/lib/validations/schemas';

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

  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
  const noteType = req.nextUrl.searchParams.get('note_type') || undefined;

  const service = new FileNotesService(ctx.supabase);
  try {
    const result = await service.listForFile(
      ctx.agencyId,
      params.id,
      fileSource,
      fileId,
      { page, limit, noteType },
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load file notes';
    const status =
      message === 'Client not found' || message === 'File not found for this client'
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const parsed = fileNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  if (body.is_system_note || body.update || body.delete || body.recorded_at) {
    return NextResponse.json(
      { error: 'File notes are append-only. Only insert is permitted.' },
      { status: 403 },
    );
  }

  const service = new FileNotesService(ctx.supabase);
  try {
    const note = await service.addManualNote(
      ctx.agencyId,
      params.id,
      ctx.userId,
      parsed.data,
    );
    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to add file note';
    const status =
      message === 'Client not found' || message === 'File not found for this client'
        ? 404
        : message === 'Invalid note type'
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
