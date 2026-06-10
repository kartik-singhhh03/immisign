import { NextRequest, NextResponse } from 'next/server';
import { canWriteTemplates } from '@/lib/auth/db-roles';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { parsePaginationParams, paginatedJson } from '@/lib/api/pagination';

export async function GET(req: NextRequest) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) return apiError(ctx.error, ctx.status);

  const params = parsePaginationParams(req.nextUrl.searchParams, { limit: 10, maxLimit: 50 });
  let query = (ctx.supabase as any)
    .from('templates')
    .select('*', { count: 'exact' })
    .eq('agency_id', ctx.agencyId)
    .order(params.sort === 'name' ? 'name' : 'updated_at', { ascending: params.ascending })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return paginatedJson(data ?? [], count ?? 0, params.page, params.limit);
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/templates', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    if (!canWriteTemplates(ctx.dbRole)) {
      return apiError('Your role cannot create templates', 403);
    }

    const body = await req.json();
    const { name, description, content } = body as {
      name?: string;
      description?: string;
      content?: unknown;
    };

    if (!name?.trim()) {
      return apiError('Name is required', 400);
    }

    const { data, error } = await (ctx.supabase as any)
      .from('templates')
      .insert({
        agency_id: ctx.agencyId,
        name: name.trim(),
        description: description?.trim() || null,
        content: content ?? { html: '<p>New template</p>' },
      })
      .select('*')
      .single();

    if (error) {
      return apiError(error.message, 403);
    }

    return NextResponse.json({ success: true, template: data });
  });
}
