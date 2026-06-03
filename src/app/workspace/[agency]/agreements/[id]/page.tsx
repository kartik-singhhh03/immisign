import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    auditLogs = await auditRepo.listForAgreement(params.id);

    const { data: docs } = await supabase.from('documents').select('*').eq('agreement_id', params.id).order('created_at', { ascending: false }).limit(1);
    if (docs && docs.length > 0) {
      const { data: urlData } = await supabase.storage.from('secure_documents').createSignedUrl(docs[0].file_url, 3600);
      documentUrl = urlData?.signedUrl;
    }
  } catch {
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
