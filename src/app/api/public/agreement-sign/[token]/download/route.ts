import { NextRequest, NextResponse } from 'next/server';
import { NativeAgreementSigningService } from '@/features/agreements/services/native-agreement-signing.service';
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
  return withApiRoute('GET /api/public/agreement-sign/[token]/download', async () => {
    const ip = clientIp(req) || 'unknown';
    if (!checkRateLimit(`agr-sign-dl:${ip}`, 30, 60_000)) {
      return apiError('Too many requests', 429);
    }

    const svc = new NativeAgreementSigningService();
    const agreement = await svc.getByToken(params.token);
    if (!agreement) return apiError('Not found', 404);
    if (svc.isExpired(agreement)) return apiError('Link expired', 410);

    await svc.logDownload(params.token, ip, req.headers.get('user-agent') || undefined);
    const url = await svc.getSignedDownloadUrl(agreement);
    return NextResponse.redirect(url);
  });
}
