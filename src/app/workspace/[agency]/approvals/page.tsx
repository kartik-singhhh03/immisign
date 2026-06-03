import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalsList } from '@/features/approvals/components/list/approvals-list';

export default async function ApprovalsPage({ params }: { params: { agency: string } }) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const { data: team } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('agency_id', agency.id);

  const userMap = Object.fromEntries(
    (team || []).map((u) => [u.id, u.full_name || u.email || 'User']),
  );

  return (
    <ApprovalsList
      agencySlug={params.agency}
      agencyId={agency.id}
      userMap={userMap}
    />
  );
}
