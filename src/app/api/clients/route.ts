import { NextRequest } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { parsePaginationParams, paginatedJson } from '@/lib/api/pagination';
import { ClientsRepository } from '@/lib/supabase/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/clients', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const params = parsePaginationParams(req.nextUrl.searchParams, { limit: 10, maxLimit: 50 });
    const repo = new ClientsRepository(ctx.supabase);
    const result = await repo.list(ctx.agencyId, params);
    return paginatedJson(result.data, result.count, params.page, params.limit);
  });
}
