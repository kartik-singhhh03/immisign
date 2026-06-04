import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AgreementsList } from '@/features/agreements/components/list/agreements-list';

export default async function AgreementsPage({ params }: { params: { agency: string } }) {
  const supabase = (await createClient()) as any;

  // Verify tenant access securely via current authenticated session
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, slug')
    .eq('slug', params.agency)
    .single();

  if (!agency) {
    console.error("Agency not found for slug:", params.agency);
    return notFound();
  }

  // Fetch real agreements filtered by agency, including fee schedule join
  const { data: rawAgreements, error: fetchErr } = await (supabase as any)
    .from('agreements')
    .select('*, payment_schedules(total_amount)')
    .eq('agency_id', agency.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error("Error fetching agreements:", fetchErr);
  }

  // Map database agreements directly to the expected list schema
  const agreements = (rawAgreements || []).map((a: any) => {
    const schedules = a.payment_schedules;
    const schedule = Array.isArray(schedules) ? schedules[0] : schedules;
    const totalAmount = schedule?.total_amount ? parseFloat(schedule.total_amount) : 0;

    return {
      /** Always the database UUID — use for routes and archive. */
      agreementUuid: a.id,
      id: a.id,
      ref: a.agreement_number || `AGR-${String(a.id).slice(0, 8).toUpperCase()}`,
      client: a.client_name || "Unnamed Client",
      email: a.client_email || "",
      matter: a.metadata?.visa_category || "General Service Agreement",
      fee: totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : "$0.00",
      status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      date: new Date(a.created_at).toLocaleDateString("en-AU", {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      scope: a.description || "Standard agency representation services.",
      law: "New South Wales (NSW)"
    };
  });

  return (
    <AgreementsList 
      initialAgreements={agreements} 
      agencySlug={params.agency} 
    />
  );
}
