import { NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { FileNotesService } from '@/features/file-notes/services/file-notes.service';

export async function GET() {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new FileNotesService(ctx.supabase);
  try {
    const noteTypes = await service.listNoteTypes();
    return NextResponse.json({ success: true, noteTypes });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load note types';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
