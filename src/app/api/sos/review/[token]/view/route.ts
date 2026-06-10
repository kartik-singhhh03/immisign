import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = createAdminClient();
  const service = new ServiceStatementService(supabase);

  try {
    const statement = await service.markViewed(params.token);
    return NextResponse.json({ success: true, statement });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
