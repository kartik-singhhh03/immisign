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
  return withApiRoute('GET /api/public/approval/[token]', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`approval-get:${ip}`, 60, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const svc = new ApplicationApprovalRebuildService(
      {} as never,
    );
    let approval = await svc.getByToken(params.token);
    if (!approval) return apiError('Link not found', 404);
    if (svc.isExpired(approval)) return apiError('Link expired', 410);
    if (svc.isCompleted(approval)) {
      return NextResponse.json({ approval, completed: true });
    }

    approval = (await svc.markViewed(
      params.token,
      clientIp(req),
      req.headers.get('user-agent') || undefined,
    ))!;

    return NextResponse.json({ approval, completed: false });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  return withApiRoute('POST /api/public/approval/[token]', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`approval-post:${ip}`, 20, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const svc = new ApplicationApprovalRebuildService({} as never);

    if (body.action === 'approve') {
      if (!body.clientName?.trim()) return apiError('Full name required', 400);
      const approval = await svc.approveByToken({
        token: params.token,
        clientName: body.clientName,
        ip: clientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });
      return NextResponse.json({ approval });
    }

    if (body.action === 'decline') {
      if (!body.reason?.trim()) return apiError('Reason required', 400);
      const approval = await svc.requestChangesByToken({
        token: params.token,
        reason: body.reason,
        ip: clientIp(req),
        userAgent: req.headers.get('user-agent') || undefined,
      });
      return NextResponse.json({ approval });
    }

    return apiError('Invalid action', 400);
  });
}
