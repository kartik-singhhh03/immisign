import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApprovalRepository } from '@/features/approvals/repositories/approvals.repository';
import { AuditRepository } from '@/features/agreements/repositories/audit.repository';
import { ApprovalDashboard } from '@/features/approvals/components/details/approval-dashboard';
import { getAppUrl } from '@/lib/app-url';

export default async function ApprovalDetailsPage({ params }: { params: { agency: string, id: string } }) {
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

  const repo = new ApprovalRepository(supabase);
  const auditRepo = new AuditRepository(supabase);
  
  let approval;
  let auditLogs: any[] = [];
  
  try {
    approval = await repo.getById(params.id);
    if (!approval || approval.agency_id !== agency.id) return notFound();
    
    // In our audit table, we track entity_id = approval.id and entity_type = 'approval'
    const { data: logs } = await supabase
      .from('audit_events')
      .select('*')
      .eq('entity_id', params.id)
      .eq('entity_type', 'approval')
      .order('created_at', { ascending: false });
      
    if (logs) auditLogs = logs;

  } catch (e) {
    return notFound();
  }

  // Assuming the host URL is passed via env or we construct it manually
  const portalUrl = `${getAppUrl()}/review/${approval.review_token ?? ''}`;

  // We mock a document URL for the MVP viewer
  const documentUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  return (
    <ApprovalDashboard 
      approval={approval} 
      agencySlug={params.agency}
      auditLogs={auditLogs}
      portalUrl={portalUrl}
      documentUrl={documentUrl}
    />
  );
}
