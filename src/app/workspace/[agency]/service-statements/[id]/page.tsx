import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SosWizard } from '@/features/service-statements/components/sos-wizard';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';

export default async function EditServiceStatementPage({
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

  const { data: row } = await supabase
    .from('service_statements')
    .select('client_id')
    .eq('id', params.id)
    .eq('agency_id', agency.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!row?.client_id) return notFound();

  const service = new ServiceStatementService(supabase);
  const statement = await service.getById(agency.id, row.client_id, params.id);

  if (!['draft', 'generated'].includes(statement.status)) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <SosWizard agencySlug={agency.slug} existingStatement={statement} />
    </div>
  );
}
