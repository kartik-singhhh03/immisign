import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api'
import { apiError, withApiRoute } from '@/lib/api/json-response'
import { SearchAnalyticsService } from '@/features/search/services/search-analytics.service'

export async function GET() {
  return withApiRoute('GET /api/search/history', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const analytics = new SearchAnalyticsService(ctx.supabase)
    const recent = await analytics.getRecentSearches(ctx.agencyId, ctx.userId)
    return NextResponse.json({ success: true, recent })
  })
}

export async function DELETE() {
  return withApiRoute('DELETE /api/search/history', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const analytics = new SearchAnalyticsService(ctx.supabase)
    await analytics.clearHistory(ctx.agencyId, ctx.userId)
    return NextResponse.json({ success: true })
  })
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/search/history', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const body = await req.json()
    const analytics = new SearchAnalyticsService(ctx.supabase)
    await analytics.recordHistory(
      ctx.agencyId,
      ctx.userId,
      body.query || '',
      body.result_count ?? 0,
    )
    return NextResponse.json({ success: true })
  })
}
