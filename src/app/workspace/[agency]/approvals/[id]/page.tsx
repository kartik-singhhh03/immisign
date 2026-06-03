import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { ApprovalDashboard } from '@/features/approvals/components/details/approval-dashboard';
import { getAppUrl } from '@/lib/app-url';

export default async function ApprovalDetailsPage({ params }: { params: { agency: string, id: string } }) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const repo = new ApprovalRepository(supabase);

  let approval;
  let auditLogs: any[] = [];

  try {
    approval = await repo.getById(params.id);
    if (!approval || approval.agency_id !== agency.id) return notFound();

    const { data: logs } = await supabase
      .from('audit_events')
      .select('*')
      .eq('entity_id', params.id)
      .eq('entity_type', 'approval')
      .order('created_at', { ascending: false });

    if (logs) auditLogs = logs;
  } catch {
    return notFound();
  }

  const portalUrl = `${getAppUrl()}/review/${approval.review_token ?? ''}`;
  const documentUrl = approval.document_path || '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return notFound();
  }

  return (
    <ApprovalDashboard
      approval={approval}
      agencySlug={params.agency}
      auditLogs={auditLogs}
      portalUrl={portalUrl}
      documentUrl={documentUrl}
      userId={user.id}
    />
  );
}
