import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalService } from '@/features/approvals/services/approval.service';
import { ApprovalDetailPage } from '@/features/approvals/components/details/approval-detail-page';
import type { DbRole } from '@/lib/auth/db-roles';

export default async function ApprovalDetailsPage({
  params,
}: {
  params: { agency: string; id: string };
}) {
  const supabase = await createClient();

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return notFound();

  const service = new ApprovalService(supabase);

  try {
    const detail = await service.getDetail(
      agency.id,
      params.id,
      profile.role as DbRole,
      user.id,
    );
    return (
      <ApprovalDetailPage
        initial={detail}
        agencySlug={params.agency}
        agencyId={agency.id}
      />
    );
  } catch {
    return notFound();
  }
}
