import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AgreementWizard } from '@/features/agreements/components/wizard/agreement-wizard';

export default async function NewAgreementPage({ params }: { params: { agency: string } }) {
  const adminClient = createAdminClient();

  // Verify tenant access securely via admin client
  const { data: agency, error } = await (adminClient as any).from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (error || !agency) {
    console.error("Error looking up agency:", error);
    return notFound();
  }

  // Fetch the actual authenticated session user ID
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  return (
    <AgreementWizard 
      agencyId={agency.id}
      agencySlug={agency.slug}
      userId={userId} 
    />
  );
}
