import { createClient } from '../supabase/server';
import { getCurrentAgency, getCurrentUser } from '../supabase/auth';

type AuditLogAction = 
  | 'login' 
  | 'document_upload' 
  | 'agreement_created' 
  | 'signature_requested' 
  | 'team_member_added'
  | 'team_member_removed';

export async function logAuditAction(
  action: AuditLogAction, 
  entity_type: string, 
  entity_id: string, 
  metadata?: any
) {
  try {
    const user = await getCurrentUser();
    const agency = await getCurrentAgency();

    if (!agency) {
      console.warn('Cannot log audit action without an agency context.');
      return;
    }

    const supabase = await createClient();
    
    await (supabase.from('audit_logs') as any).insert([{
      agency_id: agency.id,
      user_id: user?.id || null,
      action,
      entity_type,
      entity_id,
      metadata
    }]);
  } catch (error) {
    // Fail silently so we don't block user flows, but log to error tracking
    console.error('Audit Log Error:', error);
  }
}
