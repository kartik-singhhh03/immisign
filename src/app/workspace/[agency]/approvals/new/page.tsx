import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApprovalWizard } from '@/features/approvals/components/wizard/approval-wizard';

export default async function NewApprovalPage({ params }: { params: { agency: string } }) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {}
    }
  });

  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  // Mocking auth for MVP
  const userId = '00000000-0000-0000-0000-000000000000';

  return (
    <ApprovalWizard 
      agencyId={agency.id}
      agencySlug={agency.slug}
      userId={userId} 
    />
  );
}
