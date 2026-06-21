import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentAuditService,
  type DocumentAuditEventType,
} from '@/lib/audit/document-audit.service';
import type { ApplicationApprovalRecord } from '../types/rebuild';

/** Compliance provider label — never blank on audit cards. */
export const APPROVAL_AUDIT_PROVIDER = 'Immimate Approval Portal';
export const APPROVAL_EMAIL_PROVIDER = 'Resend';

export type ApprovalAuditEventRow = {
  id: string;
  document_type: string;
  document_id: string;
  event_type: string;
  event_timestamp: string;
  actor_name: string | null;
  actor_email: string | null;
  ip_address: string | null;
  provider: string | null;
  metadata: Record<string, unknown>;
};

export function approvalFileMetadata(approval: Pick<
  ApplicationApprovalRecord,
  'application_file_name' | 'application_file_size' | 'application_file_path'
>) {
  return {
    original_filename: approval.application_file_name || null,
    file_size: approval.application_file_size ?? null,
    storage_path: approval.application_file_path || null,
  };
}

export async function recordApplicationApprovalAudit(
  supabase: SupabaseClient,
  approval: Pick<
    ApplicationApprovalRecord,
    | 'id'
    | 'agency_id'
    | 'client_id'
    | 'matter_id'
    | 'application_file_name'
    | 'application_file_size'
    | 'application_file_path'
  >,
  eventType: DocumentAuditEventType,
  options?: {
    eventTimestamp?: string;
    actorName?: string | null;
    actorEmail?: string | null;
    ipAddress?: string | null;
    provider?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const audit = new DocumentAuditService(supabase);
  await audit.record({
    agencyId: approval.agency_id,
    clientId: approval.client_id,
    matterId: approval.matter_id,
    documentType: 'application_approval',
    documentId: approval.id,
    eventType,
    eventTimestamp: options?.eventTimestamp,
    actorName: options?.actorName,
    actorEmail: options?.actorEmail,
    ipAddress: options?.ipAddress,
    provider: options?.provider ?? APPROVAL_AUDIT_PROVIDER,
    metadata: {
      ...approvalFileMetadata(approval),
      email_provider: APPROVAL_EMAIL_PROVIDER,
      ...options?.metadata,
    },
  });
}

/** Merge synthetic audit rows from application_approvals when legacy events are missing. */
export async function enrichApplicationApprovalAuditEvents(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  events: ApprovalAuditEventRow[],
): Promise<ApprovalAuditEventRow[]> {
  const { data: approvals } = await supabase
    .from('application_approvals')
    .select(
      'id, sent_at, viewed_at, approved_at, changes_requested_at, change_request_reason, client_name_confirmed, client_ip, application_file_name, application_file_size, application_file_path, approval_token',
    )
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .is('deleted_at', null);

  if (!approvals?.length) return normalizeApprovalAuditProviders(events);

  const byDoc = new Map<string, ApprovalAuditEventRow[]>();
  for (const row of events) {
    if (row.document_type !== 'application_approval') continue;
    const list = byDoc.get(row.document_id) || [];
    list.push(row);
    byDoc.set(row.document_id, list);
  }

  const synthetic: ApprovalAuditEventRow[] = [];

  for (const approval of approvals) {
    const existing = byDoc.get(approval.id) || [];
    const has = (type: string) => existing.some((e) => e.event_type === type);
    const fileMeta = {
      original_filename: approval.application_file_name,
      file_size: approval.application_file_size,
      storage_path: approval.application_file_path,
      email_provider: APPROVAL_EMAIL_PROVIDER,
    };

    if (approval.sent_at && !has('sent')) {
      synthetic.push(makeSynthetic(approval.id, 'sent', approval.sent_at, fileMeta));
    }
    if (approval.viewed_at && !has('viewed')) {
      synthetic.push(
        makeSynthetic(approval.id, 'viewed', approval.viewed_at, {
          ...fileMeta,
          ip_address: approval.client_ip,
        }),
      );
    }
    if (approval.approved_at && !has('signed')) {
      synthetic.push(
        makeSynthetic(approval.id, 'signed', approval.approved_at, {
          ...fileMeta,
          actor_name: approval.client_name_confirmed,
          ip_address: approval.client_ip,
        }),
      );
    }
    if (approval.approved_at && !has('acknowledged')) {
      synthetic.push(
        makeSynthetic(approval.id, 'acknowledged', approval.approved_at, {
          ...fileMeta,
          actor_name: approval.client_name_confirmed,
        }),
      );
    }
    if (approval.changes_requested_at && !has('completed')) {
      synthetic.push(
        makeSynthetic(approval.id, 'completed', approval.changes_requested_at, {
          ...fileMeta,
          action: 'changes_requested',
          change_reason: approval.change_request_reason,
          ip_address: approval.client_ip,
        }),
      );
    }
  }

  return normalizeApprovalAuditProviders([...events, ...synthetic]);
}

function makeSynthetic(
  documentId: string,
  eventType: string,
  eventTimestamp: string,
  meta: Record<string, unknown>,
): ApprovalAuditEventRow {
  return {
    id: `synthetic-${documentId}-${eventType}`,
    document_type: 'application_approval',
    document_id: documentId,
    event_type: eventType,
    event_timestamp: eventTimestamp,
    actor_name: (meta.actor_name as string) || null,
    actor_email: null,
    ip_address: (meta.ip_address as string) || null,
    provider: APPROVAL_AUDIT_PROVIDER,
    metadata: meta,
  };
}

function normalizeApprovalAuditProviders(events: ApprovalAuditEventRow[]): ApprovalAuditEventRow[] {
  return events.map((row) => {
    if (row.document_type !== 'application_approval') return row;
    return {
      ...row,
      provider: row.provider || APPROVAL_AUDIT_PROVIDER,
      metadata: {
        email_provider: APPROVAL_EMAIL_PROVIDER,
        ...row.metadata,
      },
    };
  });
}
