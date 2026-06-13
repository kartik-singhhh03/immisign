import { NextRequest, NextResponse } from 'next/server';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  return withApiRoute('GET /api/public/approval/[token]/download', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`approval-dl:${ip}`, 30, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const svc = new ApplicationApprovalRebuildService({} as never);
    const approval = await svc.getByToken(params.token);
    if (!approval) return apiError('Not found', 404);
    if (svc.isExpired(approval)) return apiError('Link expired', 410);
    if (svc.isCompleted(approval) && approval.status !== 'viewed' && approval.status !== 'sent') {
      /* allow download after completion for audit */
    }

    await svc.logDownload(
      params.token,
      ip,
      req.headers.get('user-agent') || undefined,
    );

    const url = await svc.getSignedDownloadUrl(approval);
    return NextResponse.redirect(url);
  });
}
