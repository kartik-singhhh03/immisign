import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWizard } from '@/features/approvals/components/wizard/approval-wizard';

export default async function NewApprovalPage({ params }: { params: { agency: string } }) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return notFound();
  }

  return (
    <ApprovalWizard
      agencyId={agency.id}
      agencySlug={agency.slug}
      userId={user.id}
    />
  );
}
