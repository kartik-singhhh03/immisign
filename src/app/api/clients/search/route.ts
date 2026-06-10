import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ClientSearchService } from '@/features/file-notes/services/client-search.service';

export async function GET(req: NextRequest) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ success: true, matters: [], clients: [] });
  }

  const limit = Math.min(20, Math.max(4, Number(req.nextUrl.searchParams.get('limit') || '12')));

  const service = new ClientSearchService(ctx.supabase);
  try {
    const { matters, clients } = await service.search(ctx.agencyId, q, ctx.agencySlug, limit);
    return NextResponse.json({ success: true, matters, clients });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
