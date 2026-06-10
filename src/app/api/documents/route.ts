import { NextRequest } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { parsePaginationParams, paginatedJson } from '@/lib/api/pagination';
import { DocumentsRepository } from '@/lib/supabase/repositories';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/documents', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const params = parsePaginationParams(req.nextUrl.searchParams, { limit: 10, maxLimit: 50 });
    const repo = new DocumentsRepository(ctx.supabase);
    const result = await repo.list(ctx.agencyId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
      ascending: params.ascending,
      mimeType: params.mimeType,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    return paginatedJson(result.data, result.count, params.page, params.limit);
  });
}
