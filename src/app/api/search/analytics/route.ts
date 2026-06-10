import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api'
import { apiError, withApiRoute } from '@/lib/api/json-response'
import { SearchAnalyticsService } from '@/features/search/services/search-analytics.service'
import type { SearchAnalyticsPayload } from '@/features/search/types/search.types'

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/search/analytics', async () => {
    const ctx = await getWorkspaceApiContext()
    if ('error' in ctx) return apiError(ctx.error, ctx.status)

    const body = (await req.json()) as SearchAnalyticsPayload
    const analytics = new SearchAnalyticsService(ctx.supabase)
    await analytics.trackClick(ctx.agencyId, ctx.userId, body)
    return NextResponse.json({ success: true })
  })
}
