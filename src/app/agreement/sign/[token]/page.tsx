import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { NativeAgreementSigningService } from '@/features/agreements/services/native-agreement-signing.service';
import { ClientAgreementSignPortal } from '@/features/agreements/components/portal/client-agreement-sign-portal';

export const dynamic = 'force-dynamic';

export default async function AgreementSignPage({
  params,
}: {
  params: { token: string };
}) {
  const svc = new NativeAgreementSigningService();
  const agreement = await svc.getByToken(params.token);
  if (!agreement) return notFound();

  const admin = createAdminClient();
  const [{ data: agency }, { data: agent }] = await Promise.all([
    admin.from('agencies').select('name').eq('id', agreement.agency_id).single(),
    admin.from('users').select('full_name, email').eq('id', agreement.created_by).single(),
  ]);

  return (
    <ClientAgreementSignPortal
      token={params.token}
      meta={{
        agencyName: agency?.name || 'Migration Agency',
        agentName: agent?.full_name || 'Your migration agent',
        agentEmail: agent?.email || 'agent@agency.com',
      }}
    />
  );
}
