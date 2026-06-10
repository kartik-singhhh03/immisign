import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ServiceCatalogService } from '@/features/service-statements/services/service-catalog.service';

export async function GET(req: NextRequest) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const visaSubclass = req.nextUrl.searchParams.get('visa_subclass');
  const service = new ServiceCatalogService(ctx.supabase);

  try {
    const catalog = await service.listAll();
    const defaultSelectedIds = await service.getDefaultSelectedIds(visaSubclass);
    return NextResponse.json({ success: true, catalog, defaultSelectedIds });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load catalog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
