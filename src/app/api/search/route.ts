import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api'
import { apiError, withApiRoute } from '@/lib/api/json-response'
import { GlobalSearchService, buildQuickActions } from '@/features/search/services/global-search.service'
import { SearchAnalyticsService } from '@/features/search/services/search-analytics.service'
import type { SearchFilters } from '@/features/search/types/search.types'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/search', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const q = req.nextUrl.searchParams.get('q')?.trim() || ''
    const filtersParam = req.nextUrl.searchParams.get('filters')
    let filters: SearchFilters | undefined
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam) as SearchFilters
      } catch {
        filters = undefined
      }
    }

    const includeMeta = req.nextUrl.searchParams.get('meta') === '1'
    const service = new GlobalSearchService(ctx.supabase)
    const analytics = new SearchAnalyticsService(ctx.supabase)

    const hasFilters = filters && Object.keys(filters).length > 0
    if (!q && !hasFilters) {
      const [recent, saved] = includeMeta
        ? await Promise.all([
            analytics.getRecentSearches(ctx.agencyId, ctx.userId),
            analytics.getSavedSearches(ctx.agencyId, ctx.userId),
          ])
        : [[], []]

      return NextResponse.json({
        success: true,
        query: '',
        sections: [],
        quickActions: buildQuickActions(`/workspace/${ctx.agencySlug}`),
        totalCount: 0,
        timingMs: 0,
        recent,
        saved,
      })
    }

    const result = await service.search({
      agencyId: ctx.agencyId,
      agencySlug: ctx.agencySlug,
      userId: ctx.userId,
      query: q,
      filters,
    })

    if (q.length >= 2 && result.totalCount >= 0) {
      analytics.recordHistory(ctx.agencyId, ctx.userId, q, result.totalCount).catch(() => {})
    }

    if (includeMeta) {
      const [recent, saved] = await Promise.all([
        analytics.getRecentSearches(ctx.agencyId, ctx.userId),
        analytics.getSavedSearches(ctx.agencyId, ctx.userId),
      ])
      return NextResponse.json({ ...result, recent, saved })
    }

    return NextResponse.json(result)
  })
}
