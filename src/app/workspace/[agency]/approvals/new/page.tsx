import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWizardRebuild } from '@/features/approvals/components/wizard/approval-wizard-rebuild';

export default async function NewApprovalPage({
  params,
}: {
  params: { agency: string };
}) {
  const supabase = await createClient();
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug')
    .eq('slug', params.agency)
    .single();
  if (!agency) return notFound();

  return <ApprovalWizardRebuild agencySlug={params.agency} />;
}
