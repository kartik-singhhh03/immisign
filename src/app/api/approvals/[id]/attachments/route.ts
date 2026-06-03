import { NextRequest, NextResponse } from 'next/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { getApprovalApiContext } from '@/features/approvals/lib/api-context';
import { StorageHelpers } from '@/lib/supabase/storage';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getApprovalApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  const storagePath = StorageHelpers.getApprovalDocumentPath(
    ctx.agencyId,
    params.id,
    file.name,
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await ctx.supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const service = new ApprovalService(ctx.supabase);
  try {
    const attachment = await service.uploadAttachment(
      ctx.agencyId,
      ctx.userId,
      ctx.dbRole,
      params.id,
      {
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
      },
    );

    const { data: signed } = await ctx.supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      attachment,
      signedUrl: signed?.signedUrl ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
