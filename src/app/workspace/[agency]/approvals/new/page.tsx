import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWizard } from '@/features/approvals/components/wizard/approval-wizard';

export default async function NewApprovalPage({
  params,
  searchParams,
}: {
  params: { agency: string };
  searchParams?: { clientId?: string };
}) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const [{ data: clients }, { data: matterTypes }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('agency_id', agency.id).order('name'),
    supabase.from('matter_types').select('id, name').eq('agency_id', agency.id).order('name'),
  ]);

  const initialClientId =
    searchParams?.clientId &&
    (clients || []).some((c) => c.id === searchParams.clientId)
      ? searchParams.clientId
      : undefined;

  return (
    <ApprovalWizard
      agencyId={agency.id}
      agencySlug={params.agency}
      clients={clients || []}
      matterTypes={matterTypes || []}
      initialClientId={initialClientId}
    />
  );
}
