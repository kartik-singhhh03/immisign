import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SosWizard } from '@/features/service-statements/components/sos-wizard';

export default async function NewServiceStatementPage({
  params,
  searchParams,
}: {
  params: { agency: string };
  searchParams?: {
    clientId?: string;
    file_source?: string;
    file_id?: string;
    agreement_id?: string;
    approval_id?: string;
  };
}) {
  const supabase = await createClient();
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug')
    .eq('slug', params.agency)
    .single();

  if (!agency) return notFound();

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <SosWizard
        agencySlug={agency.slug}
        initialClientId={searchParams?.clientId}
        initialFileSource={
          searchParams?.file_source === 'agreement' ||
          searchParams?.file_source === 'application_approval'
            ? searchParams.file_source
            : undefined
        }
        initialFileId={searchParams?.file_id}
        initialAgreementId={searchParams?.agreement_id}
        initialApprovalId={searchParams?.approval_id}
      />
    </div>
  );
}
