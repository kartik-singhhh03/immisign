import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { ApprovalDetailRebuild } from '@/features/approvals/components/details/approval-detail-rebuild';

export default async function ApprovalDetailsPage({
  params,
}: {
  params: { agency: string; id: string };
}) {
  const supabase = await createClient();

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug')
    .eq('slug', params.agency)
    .single();
  if (!agency) return notFound();

  const svc = new ApplicationApprovalRebuildService(supabase);
  const approval = await svc.getById(agency.id, params.id);
  if (!approval) return notFound();

  const { data: events } = await supabase
    .from('application_approval_events')
    .select('id, event_type, description, created_at')
    .eq('approval_id', params.id)
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false });

  return (
    <ApprovalDetailRebuild
      approval={approval}
      events={events || []}
      agencySlug={params.agency}
    />
  );
}
