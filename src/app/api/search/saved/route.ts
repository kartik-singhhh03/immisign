import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api'
import { apiError, withApiRoute } from '@/lib/api/json-response'
import { SearchAnalyticsService } from '@/features/search/services/search-analytics.service'
import type { SearchFilters } from '@/features/search/types/search.types'

export async function GET() {
  return withApiRoute('GET /api/search/saved', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const analytics = new SearchAnalyticsService(ctx.supabase)
    const saved = await analytics.getSavedSearches(ctx.agencyId, ctx.userId)
    return NextResponse.json({ success: true, saved })
  })
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/search/saved', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const body = await req.json()
    if (!body.name?.trim() || !body.query?.trim()) {
      return apiError('Name and query are required', 400)
    }

    const analytics = new SearchAnalyticsService(ctx.supabase)
    const saved = await analytics.saveSearch(
      ctx.agencyId,
      ctx.userId,
      body.name.trim(),
      body.query.trim(),
      (body.filters || {}) as SearchFilters,
    )
    return NextResponse.json({ success: true, saved })
  })
}

export async function DELETE(req: NextRequest) {
  return withApiRoute('DELETE /api/search/saved', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return apiError('id required', 400)

    const analytics = new SearchAnalyticsService(ctx.supabase)
    await analytics.deleteSavedSearch(ctx.agencyId, ctx.userId, id)
    return NextResponse.json({ success: true })
  })
}
