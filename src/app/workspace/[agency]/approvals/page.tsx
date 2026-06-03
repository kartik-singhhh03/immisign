import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { ApprovalsList } from '@/features/approvals/components/list/approvals-list';

export default async function ApprovalsPage({ params }: { params: { agency: string } }) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const repo = new ApprovalRepository(supabase);
  const rawApprovals = await repo.listForAgency(agency.id);

  const approvals = rawApprovals.map((a) => ({
    id: a.id,
    clientName: a.title.split(' - ')[0] || a.title,
    visaSubclass: a.visa_subclass || 'Visa',
    agentName: 'Assigned Agent',
    status: a.status,
    lodgementDeadline: a.lodgement_deadline || null,
  }));

  return (
    <ApprovalsList
      initialApprovals={approvals}
      agencySlug={params.agency}
    />
  );
}
