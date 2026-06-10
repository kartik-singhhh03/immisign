import { notFound } from 'next/navigation';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { ClientReviewPortal } from '@/features/approvals/components/portal/client-review-portal';
import { createAdminClient } from '@/lib/supabase/admin';

async function resolveDocumentUrl(
  supabase: ReturnType<typeof createAdminClient>,
  approval: { id: string; document_path?: string | null },
): Promise<string | null> {
  if (!approval.document_path) return null;

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(approval.document_path, 3600);

  return data?.signedUrl ?? null;
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const repo = new ApprovalRepository(supabase);
  const service = new ApprovalService(supabase);

  const approval = await repo.getByToken(params.token);
  if (!approval) return notFound();

  try {
    await service.markViewedByClient(params.token);
  } catch {
    // Ignore transition errors if already viewed
  }

  const updatedApproval = await repo.getByToken(params.token);
  const documentUrl = await resolveDocumentUrl(supabase, updatedApproval!);

  if (!documentUrl) return notFound();

  return (
    <ClientReviewPortal
      approval={updatedApproval!}
      token={params.token}
      documentUrl={documentUrl}
    />
  );
}
