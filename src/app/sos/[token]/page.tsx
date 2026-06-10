import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';
import { SosClientPortal } from '@/features/service-statements/components/sos-client-portal';

export default async function SosReviewPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();
  const service = new ServiceStatementService(supabase);

  const statement = await service.getByToken(params.token);
  if (!statement) return notFound();

  let documentUrl: string | null = null;
  if (statement.document_path) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(statement.document_path, 3600);
    documentUrl = data?.signedUrl ?? null;
  }

  const { data: agency } = await supabase
    .from('agencies')
    .select('name')
    .eq('id', statement.agency_id)
    .single();

  return (
    <SosClientPortal
      token={params.token}
      initial={{
        statement_number: statement.statement_number,
        client_name: statement.client_name,
        status: statement.status,
        acknowledged_at: statement.acknowledged_at,
        agency_name: agency?.name || 'Agency',
        documentUrl,
      }}
    />
  );
}
