import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentAuditService,
  type DocumentAuditEventType,
} from '@/lib/audit/document-audit.service';
import { APP_NAME } from '@/lib/brand';

export const AGREEMENT_NATIVE_PORTAL_PROVIDER = `${APP_NAME} Native Signing Portal`;
export const AGREEMENT_EMAIL_PROVIDER = 'Resend';
export const AGREEMENT_SYSTEM_PROVIDER = APP_NAME;

export type AgreementAuditEventRow = {
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

export type AgreementAuditContext = {
  id: string;
  agency_id: string;
  client_id: string | null;
  matter_id: string | null;
  title?: string | null;
  agreement_number?: string | null;
};

export function agreementFileMetadata(agreement: AgreementAuditContext) {
  return {
    agreement_id: agreement.id,
    agreement_number: agreement.agreement_number || null,
    title: agreement.title || null,
  };
}

export async function recordAgreementSigningAudit(
  supabase: SupabaseClient,
  agreement: AgreementAuditContext,
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
    agencyId: agreement.agency_id,
    clientId: agreement.client_id,
    matterId: agreement.matter_id,
    documentType: 'service_agreement',
    documentId: agreement.id,
    eventType,
    eventTimestamp: options?.eventTimestamp,
    actorName: options?.actorName,
    actorEmail: options?.actorEmail,
    ipAddress: options?.ipAddress,
    provider: options?.provider ?? AGREEMENT_NATIVE_PORTAL_PROVIDER,
    metadata: {
      ...agreementFileMetadata(agreement),
      email_provider: AGREEMENT_EMAIL_PROVIDER,
      ...options?.metadata,
    },
  });
}

/** Backfill synthetic rows from agreements columns when legacy audit events missing. */
export async function enrichAgreementSigningAuditEvents(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  events: AgreementAuditEventRow[],
): Promise<AgreementAuditEventRow[]> {
  const { data: agreements } = await supabase
    .from('agreements')
    .select(
      'id, sent_at, viewed_at, downloaded_at, signed_at, completed_at, client_name_confirmed, client_ip, signing_provider, signing_record_storage_path, signed_pdf_storage_path',
    )
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .is('deleted_at', null);

  if (!agreements?.length) return normalizeAgreementAuditProviders(events);

  const byDoc = new Map<string, AgreementAuditEventRow[]>();
  for (const row of events) {
    if (row.document_type !== 'service_agreement') continue;
    const list = byDoc.get(row.document_id) || [];
    list.push(row);
    byDoc.set(row.document_id, list);
  }

  const synthetic: AgreementAuditEventRow[] = [];

  for (const agreement of agreements) {
    const existing = byDoc.get(agreement.id) || [];
    const has = (type: string) => existing.some((e) => e.event_type === type);
    const fileMeta = {
      ...agreementFileMetadata({ id: agreement.id, agency_id: agencyId, client_id: clientId, matter_id: null }),
      signing_provider: agreement.signing_provider,
    };

    if (agreement.sent_at && !has('sent')) {
      synthetic.push(makeSynthetic(agreement.id, 'sent', agreement.sent_at, fileMeta, AGREEMENT_EMAIL_PROVIDER));
    }
    if (agreement.viewed_at && !has('viewed')) {
      synthetic.push(
        makeSynthetic(agreement.id, 'viewed', agreement.viewed_at, {
          ...fileMeta,
          ip_address: agreement.client_ip,
        }),
      );
    }
    if (agreement.signed_at && !has('signed')) {
      synthetic.push(
        makeSynthetic(agreement.id, 'signed', agreement.signed_at, {
          ...fileMeta,
          actor_name: agreement.client_name_confirmed,
          ip_address: agreement.client_ip,
        }),
      );
    }
    if (agreement.completed_at && !has('acknowledged')) {
      synthetic.push(
        makeSynthetic(agreement.id, 'acknowledged', agreement.completed_at, {
          ...fileMeta,
          actor_name: agreement.client_name_confirmed,
        }),
      );
    }
    if (agreement.signing_record_storage_path && !has('generated')) {
      synthetic.push(
        makeSynthetic(agreement.id, 'generated', agreement.completed_at || agreement.signed_at || new Date().toISOString(), {
          ...fileMeta,
          action: 'agreement_record_generated',
          signing_record_storage_path: agreement.signing_record_storage_path,
        }, AGREEMENT_SYSTEM_PROVIDER),
      );
    }
  }

  return normalizeAgreementAuditProviders([...events, ...synthetic]);
}

function makeSynthetic(
  documentId: string,
  eventType: string,
  eventTimestamp: string,
  meta: Record<string, unknown>,
  provider = AGREEMENT_NATIVE_PORTAL_PROVIDER,
): AgreementAuditEventRow {
  return {
    id: `synthetic-${documentId}-${eventType}`,
    document_type: 'service_agreement',
    document_id: documentId,
    event_type: eventType,
    event_timestamp: eventTimestamp,
    actor_name: (meta.actor_name as string) || null,
    actor_email: null,
    ip_address: (meta.ip_address as string) || null,
    provider,
    metadata: meta,
  };
}

function normalizeAgreementAuditProviders(events: AgreementAuditEventRow[]): AgreementAuditEventRow[] {
  return events.map((row) => {
    if (row.document_type !== 'service_agreement') return row;
    const provider =
      row.provider ||
      (row.event_type === 'sent' ? AGREEMENT_EMAIL_PROVIDER : AGREEMENT_NATIVE_PORTAL_PROVIDER);
    return {
      ...row,
      provider,
      metadata: {
        email_provider: AGREEMENT_EMAIL_PROVIDER,
        ...row.metadata,
      },
    };
  });
}
