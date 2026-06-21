import { NextRequest, NextResponse } from 'next/server';
import { NativeAgreementSigningService } from '@/features/agreements/services/native-agreement-signing.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { checkRateLimit } from '@/lib/rate-limit';
import { ConflictError, GoneError, NotFoundError } from '@/lib/utils/errors';

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
  return withApiRoute('GET /api/public/agreement-sign/[token]', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`agr-sign-get:${ip}`, 60, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const svc = new NativeAgreementSigningService();
    const agreement = await svc.getByToken(params.token);
    if (!agreement) return apiError('Link not found', 404);
    if (svc.isExpired(agreement)) return apiError('Link expired', 410);
    if (svc.isCompleted(agreement)) {
      return NextResponse.json({ agreement, completed: true });
    }

    const updated = await svc.markViewed(params.token, clientIp(req), req.headers.get('user-agent') || undefined);
    return NextResponse.json({ agreement: updated, completed: false });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  return withApiRoute('POST /api/public/agreement-sign/[token]', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`agr-sign-post:${ip}`, 20, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const svc = new NativeAgreementSigningService();

    if (body.action === 'sign') {
      if (!body.clientName?.trim()) return apiError('Full legal name required', 400);
      if (!body.signaturePngBase64) return apiError('Signature required', 400);
      try {
        const agreement = await svc.signByToken({
          token: params.token,
          clientName: body.clientName.trim(),
          signaturePngBase64: body.signaturePngBase64,
          declarations: body.declarations || {},
          ip: clientIp(req),
          userAgent: req.headers.get('user-agent') || undefined,
        });
        return NextResponse.json({ agreement, completed: true });
      } catch (e) {
        if (e instanceof ConflictError) {
          const agreement = await svc.getByToken(params.token);
          return NextResponse.json({ agreement, completed: true, error: e.message }, { status: 409 });
        }
        if (e instanceof GoneError) return apiError(e.message, 410);
        if (e instanceof NotFoundError) return apiError(e.message, 404);
        return apiError(e instanceof Error ? e.message : 'Signing failed', 400);
      }
    }

    return apiError('Invalid action', 400);
  });
}
