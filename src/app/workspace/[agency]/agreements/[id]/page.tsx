import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AgreementService } from '@/features/agreements/services/agreements.service';
import { AuditRepository } from '@/features/agreements/repositories/audit.repository';
import { AgreementDashboard } from '@/features/agreements/components/details/agreement-dashboard';

export default async function AgreementDetailsPage({ params }: { params: { agency: string, id: string } }) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const service = new AgreementService(supabase);
  const auditRepo = new AuditRepository(supabase);
  const role = 'agency_admin' as any;

  let agreement;
  let auditLogs: any[] = [];
  let documentUrl = null;

  try {
    agreement = await service.getAgreement(agency.id, role, params.id);
    const agreementUuid = agreement.id;
    auditLogs = await auditRepo.listForAgreement(agreementUuid);

    const admin = createAdminClient();
    const { data: agreementRow } = await admin
      .from('agreements')
      .select('signed_pdf_storage_path')
      .eq('id', agreementUuid)
      .single();

    let storagePath = agreementRow?.signed_pdf_storage_path ?? null;

    if (!storagePath) {
      const { data: docs } = await admin
        .from('documents')
        .select('file_url')
        .eq('agreement_id', agreementUuid)
        .order('created_at', { ascending: false })
        .limit(1);
      storagePath = docs?.[0]?.file_url ?? null;
    }

    if (storagePath) {
      const { data: urlData } = await admin.storage
        .from('secure_documents')
        .createSignedUrl(storagePath, 3600);
      documentUrl = urlData?.signedUrl ?? null;
    }
  } catch (err) {
    console.error('[agreement-detail]', params.id, err);
    return notFound();
  }

  return (
    <AgreementDashboard
      agreement={agreement}
      agencySlug={params.agency}
      auditLogs={auditLogs}
      documentUrl={documentUrl}
    />
  );
}
