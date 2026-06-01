import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { ApprovalsList } from '@/features/approvals/components/list/approvals-list';

export default async function ApprovalsPage({ params }: { params: { agency: string } }) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {}
    }
  });

  // Verify tenant access
  const { data: agency } = await supabase.from('agencies').select('id, slug').eq('slug', params.agency).single();
  if (!agency) return notFound();

  const repo = new ApprovalRepository(supabase);
  
  // Note: For MVP we bypass strict role filtering on the list
  const rawApprovals = await repo.listForAgency(agency.id);

  // Map to the prototype UI expected shape
  const approvals = rawApprovals.map(a => ({
    id: a.id.split('-')[0], // Short ID for UI
    clientName: a.title.split(' - ')[0] || 'Client', // Mock split if title contains name
    visaSubclass: a.visa_subclass || 'Visa',
    agentName: 'System Agent', // Usually JOIN users
    status: a.status,
    lodgementDeadline: a.lodgement_deadline || null,
  }));

  // Ensure there's always mock data for the premium UI demonstration if DB is empty
  const displayApprovals = approvals.length > 0 ? approvals : [
    { id: "APP-5021", clientName: "Jaskaran Singh", visaSubclass: "Subclass 189", agentName: "Rajwant Singh", status: "pending_review", lodgementDeadline: "2026-06-15" },
    { id: "APP-5019", clientName: "Amanpreet Kaur", visaSubclass: "Subclass 820", agentName: "Rajwant Singh", status: "approved", lodgementDeadline: "2026-06-01" },
    { id: "APP-5018", clientName: "Vikram Sharma", visaSubclass: "Subclass 482", agentName: "Rajwant Singh", status: "changes_requested", lodgementDeadline: "2026-05-30" },
  ];

  return (
    <ApprovalsList 
      initialApprovals={displayApprovals} 
      agencySlug={params.agency} 
    />
  );
}
