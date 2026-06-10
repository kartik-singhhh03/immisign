import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { OnboardingService } from '@/features/onboarding/services/onboarding.service';
import { onboardingCompleteSchema } from '@/lib/validations/onboarding';
import { formatZodError } from '@/lib/validations/fields';

export async function POST(req: NextRequest) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const parsed = onboardingCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const service = new OnboardingService(ctx.supabase);
  try {
    const result = await service.complete(
      ctx.agencyId,
      ctx.userId,
      ctx.agencySlug,
      parsed.data,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Onboarding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
