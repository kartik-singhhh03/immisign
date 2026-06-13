import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApplicationApprovalRebuildService } from '@/features/approvals/services/application-approval-rebuild.service';
import { ClientApprovalPortal } from '@/features/approvals/components/portal/client-approval-portal';

export const dynamic = 'force-dynamic';

export default async function ClientApprovalPage({
  params,
}: {
  params: { token: string };
}) {
  const svc = new ApplicationApprovalRebuildService({} as never);
  const approval = await svc.getByToken(params.token);
  if (!approval) return notFound();

  const admin = createAdminClient();
  const [{ data: agency }, { data: agent }] = await Promise.all([
    admin.from('agencies').select('name').eq('id', approval.agency_id).single(),
    admin.from('users').select('full_name, email').eq('id', approval.created_by).single(),
  ]);

  return (
    <ClientApprovalPortal
      token={params.token}
      meta={{
        agencyName: agency?.name || 'Migration Agency',
        agentName: agent?.full_name || 'Your migration agent',
        agentEmail: agent?.email || 'agent@agency.com',
      }}
    />
  );
}
