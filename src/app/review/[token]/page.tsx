import { notFound } from 'next/navigation';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { ClientReviewPortal } from '@/features/approvals/components/portal/client-review-portal';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const repo = new ApprovalRepository(supabase);
  const service = new ApprovalService(supabase);
  
  const approval = await repo.getByToken(params.token);
  if (!approval) return notFound();

  // Automatically mark as viewed if in correct state
  try {
    await service.markViewedByClient(params.token);
  } catch (e) {
    // Ignore transition errors if already viewed/approved
  }

  // Refetch to get updated status
  const updatedApproval = await repo.getByToken(params.token);
  
  // Mock document URL
  const documentUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  return (
    <ClientReviewPortal 
      approval={updatedApproval!}
      token={params.token}
      documentUrl={documentUrl}
    />
  );
}
