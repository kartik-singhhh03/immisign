import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFService } from '@/features/agreements/services/pdf.service';
import {
  buildMatterClientPath,
  resolveFileScopeFromStatement,
} from '@/features/clients/lib/matter-scope';
import {
  maybeRecordClientCompleteNote,
  recordClientSystemNote,
} from '@/features/file-notes/services/file-notes.service';
import {
  NotificationService,
  buildWorkspaceActionUrl,
} from '@/lib/notifications/notification.service';
import { sendTransactionalEmail } from '@/lib/email/transactional';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSosPreviewHtml } from '../lib/sos-preview-html';
import { recordComplianceEvent } from '@/lib/compliance/compliance-events.service';
import {
  extractClientLastName,
  formatSosPdfFilename,
} from '@/lib/documents/document-naming';
import type { SaveSosDraftInput, ServiceStatement, ServiceStatementItem } from '../types';
import { ServiceCatalogService } from './service-catalog.service';

function calcTotal(
  professional: number,
  government: number,
  disbursements: number,
): number {
  return Math.round((professional + government + disbursements) * 100) / 100;
}

export class ServiceStatementService {
  constructor(private supabase: SupabaseClient) {}

  async listForClient(
    agencyId: string,
    clientId: string,
    opts?: {
      agreementId?: string | null;
      approvalId?: string | null;
      fileSource?: 'agreement' | 'application_approval';
      fileId?: string;
    },
  ): Promise<ServiceStatement[]> {
    const hasScope =
      opts?.agreementId ||
      opts?.approvalId ||
      (opts?.fileSource && opts?.fileId);

    let query = this.supabase
      .from('service_statements')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null);

    if (hasScope) {
      const { agreementIds, approvalIds } = await this.resolveMatterLinkIds(
        agencyId,
        clientId,
        opts,
      );
      const orParts: string[] = [];
      for (const id of agreementIds) orParts.push(`agreement_id.eq.${id}`);
      for (const id of approvalIds) orParts.push(`approval_id.eq.${id}`);
      if (orParts.length) {
        query = query.or(orParts.join(','));
      } else {
        return [];
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as ServiceStatement[];
  }

  async getById(
    agencyId: string,
    clientId: string,
    statementId: string,
  ): Promise<ServiceStatement & { items: ServiceStatementItem[] }> {
    const statement = await this.getOwned(agencyId, clientId, statementId);
    const items = await this.listItems(agencyId, statementId);
    return { ...statement, items };
  }

  async getByToken(token: string): Promise<
    (ServiceStatement & { items: ServiceStatementItem[] }) | null
  > {
    const { data, error } = await this.supabase
      .from('service_statements')
      .select('*')
      .eq('review_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const items = await this.listItems(data.agency_id, data.id);
    return { ...(data as ServiceStatement), items };
  }

  async createDraft(
    agencyId: string,
    userId: string,
    input: SaveSosDraftInput,
  ): Promise<ServiceStatement> {
    const { data: client } = await this.supabase
      .from('clients')
      .select('id, name, email, phone, client_number')
      .eq('id', input.client_id)
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (!client) throw new Error('Client not found');

    const statementNumber = await this.nextStatementNumber(agencyId, input.client_id);
    const prof = input.professional_fee ?? 0;
    const gov = input.government_fee ?? 0;
    const disb = input.disbursements ?? 0;

    const { data, error } = await this.supabase
      .from('service_statements')
      .insert({
        agency_id: agencyId,
        client_id: input.client_id,
        created_by: userId,
        statement_number: statementNumber,
        status: 'draft',
        issued_stage: input.issued_stage || 'on_completion',
        agreement_id: input.agreement_id || null,
        approval_id: input.approval_id || null,
        matter_type_id: input.matter_type_id || null,
        client_name: input.client_name || client.name,
        client_number: input.client_number || client.client_number,
        client_email: input.client_email || client.email,
        client_phone: input.client_phone || client.phone,
        visa_subclass: input.visa_subclass || null,
        services_completed_at: input.services_completed_at || null,
        services_notes: input.services_notes || null,
        professional_fee: prof,
        government_fee: gov,
        disbursements: disb,
        total_received: calcTotal(prof, gov, disb),
        quoted_professional_fee: input.quoted_professional_fee ?? prof,
        payment_terms: input.payment_terms || null,
        payment_dates: input.payment_dates || null,
        payment_methods: input.payment_methods || [],
        review_token: crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (input.selected_service_ids?.length) {
      await this.saveServiceItems(agencyId, data.id, input.selected_service_ids);
    }

    const admin = createAdminClient();
    const matterScope = resolveFileScopeFromStatement(data);
    await recordClientSystemNote(admin, {
      agencyId,
      clientId: input.client_id,
      actorUserId: userId,
      body: `Statement of Service ${statementNumber} draft created.`,
      referenceType: 'service_statement',
      referenceId: data.id,
      fileSource: matterScope?.fileSource,
      fileId: matterScope?.fileId,
      metadata: {
        agreement_id: data.agreement_id,
        approval_id: data.approval_id,
        statement_number: statementNumber,
      },
    });

    await recordComplianceEvent(admin, {
      agencyId,
      clientId: input.client_id,
      eventType: 'sos_created',
      fileSource: matterScope?.fileSource ?? null,
      fileId: matterScope?.fileId ?? null,
      actorUserId: userId,
      metadata: { statement_id: data.id, statement_number: statementNumber },
    });

    return data as ServiceStatement;
  }

  async updateDraft(
    agencyId: string,
    clientId: string,
    statementId: string,
    input: Partial<SaveSosDraftInput>,
  ): Promise<ServiceStatement> {
    const statement = await this.getOwned(agencyId, clientId, statementId);
    if (!['draft', 'generated'].includes(statement.status)) {
      throw new Error('Only draft or generated statements can be edited');
    }

    const prof = input.professional_fee ?? statement.professional_fee ?? 0;
    const gov = input.government_fee ?? statement.government_fee ?? 0;
    const disb = input.disbursements ?? statement.disbursements ?? 0;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      professional_fee: prof,
      government_fee: gov,
      disbursements: disb,
      total_received: calcTotal(Number(prof), Number(gov), Number(disb)),
    };

    const fields: (keyof SaveSosDraftInput)[] = [
      'client_name',
      'client_number',
      'client_email',
      'client_phone',
      'visa_subclass',
      'agreement_id',
      'approval_id',
      'matter_type_id',
      'services_completed_at',
      'services_notes',
      'issued_stage',
      'quoted_professional_fee',
      'payment_terms',
      'payment_dates',
      'payment_methods',
    ];

    for (const f of fields) {
      if (input[f] !== undefined) patch[f] = input[f];
    }

    const { data, error } = await this.supabase
      .from('service_statements')
      .update(patch)
      .eq('id', statementId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (input.selected_service_ids) {
      await this.saveServiceItems(agencyId, statementId, input.selected_service_ids);
    }

    return data as ServiceStatement;
  }

  async generatePdf(
    agencyId: string,
    userId: string,
    clientId: string,
    statementId: string,
  ): Promise<ServiceStatement> {
    const full = await this.getById(agencyId, clientId, statementId);
    if (!full.client_id) throw new Error('Client required');

    const { data: agency } = await this.supabase
      .from('agencies')
      .select('name, metadata')
      .eq('id', agencyId)
      .single();

    const { data: defaults } = await this.supabase
      .from('matter_defaults')
      .select('sos_compliance_disclosure')
      .eq('agency_id', agencyId)
      .maybeSingle();

    const agencyMeta = (agency?.metadata || {}) as Record<string, unknown>;
    const matterRef = await this.resolveStatementMatterRef(agencyId, clientId, full);
    const html = buildSosPreviewHtml(full, full.items, {
      agency: {
        name: agency?.name || 'Agency',
        marn: (agencyMeta.marn as string) || null,
        address: (agencyMeta.address as string) || null,
      },
      complianceDisclosure: defaults?.sos_compliance_disclosure ?? null,
      headerContext: {
        agencyName: agency?.name || 'Agency',
        marn: (agencyMeta.marn as string) || null,
        matterRef: matterRef.fileNumber || full.statement_number,
        clientName: full.client_name,
      },
    });

    const bytes = await PDFService.generatePdf(html);
    const pdfFilename = formatSosPdfFilename(
      matterRef.fileNumber || full.statement_number || statementId,
      extractClientLastName(full.client_name || 'Client'),
      new Date(),
    );
    const storagePath = `${agencyId}/service-statements/${statementId}/${pdfFilename}`;
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('service_statements')
      .update({
        status: 'generated',
        document_path: storagePath,
        generated_at: now,
        updated_at: now,
      })
      .eq('id', statementId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const matterScope = resolveFileScopeFromStatement(full);
    await recordClientSystemNote(admin, {
      agencyId,
      clientId,
      actorUserId: userId,
      body: `Statement of Service ${full.statement_number || statementId} PDF generated.`,
      referenceType: 'service_statement',
      referenceId: statementId,
      fileSource: matterScope?.fileSource,
      fileId: matterScope?.fileId,
    });

    return data as ServiceStatement;
  }

  async send(agencyId: string, userId: string, clientId: string, statementId: string) {
    let statement = await this.getOwned(agencyId, clientId, statementId);

    if (!statement.document_path) {
      statement = await this.generatePdf(agencyId, userId, clientId, statementId);
    }

    if (!['generated', 'draft'].includes(statement.status)) {
      throw new Error('Statement has already been sent');
    }

    const now = new Date().toISOString();
    const token = statement.review_token || crypto.randomUUID();

    const { data, error } = await this.supabase
      .from('service_statements')
      .update({
        status: 'sent',
        sent_at: now,
        issued_at: statement.issued_at || now,
        review_token: token,
        updated_at: now,
      })
      .eq('id', statementId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const admin = createAdminClient();
    const { data: client } = await this.supabase
      .from('clients')
      .select('name, email')
      .eq('id', clientId)
      .single();
    const { data: agency } = await this.supabase
      .from('agencies')
      .select('slug, name')
      .eq('id', agencyId)
      .single();

    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sos/${token}`;

    const matterScope = resolveFileScopeFromStatement(statement);
    const matterRef = await this.resolveStatementMatterRef(agencyId, clientId, statement);
    const deepLink = matterScope
      ? buildMatterClientPath(
          agency?.slug || 'workspace',
          clientId,
          matterScope.fileSource,
          matterScope.fileId,
          'statement_of_service',
        )
      : buildWorkspaceActionUrl(
          agency?.slug || 'workspace',
          `/clients/${clientId}?tab=statement_of_service`,
        );

    await recordClientSystemNote(admin, {
      agencyId,
      clientId,
      actorUserId: userId,
      body: `Statement of Service ${statement.statement_number || statementId} sent to client for acknowledgement.`,
      referenceType: 'service_statement',
      referenceId: statementId,
      fileSource: matterScope?.fileSource,
      fileId: matterScope?.fileId,
      metadata: {
        file_number: matterRef.fileNumber,
        statement_number: statement.statement_number,
      },
    });

    await admin.from('activity_logs').insert({
      agency_id: agencyId,
      user_id: userId,
      type: 'service_statement.sent',
      title: 'Statement of Service sent',
      description: `${statement.statement_number || statementId}${matterRef.fileNumber ? ` (${matterRef.fileNumber})` : ''} sent to ${client?.name || 'client'}`,
      reference_id: statementId,
      reference_type: 'service_statement',
    });

    await recordComplianceEvent(admin, {
      agencyId,
      clientId,
      eventType: 'sos_sent',
      fileSource: matterScope?.fileSource ?? null,
      fileId: matterScope?.fileId ?? null,
      actorUserId: userId,
      metadata: { statement_id: statementId, file_number: matterRef.fileNumber },
    });

    const notify = new NotificationService(admin);
    await notify.notify({
      agencyId,
      userId,
      type: 'sos',
      title: 'Statement of Service sent',
      message: `${statement.statement_number || 'SOS'}${matterRef.fileNumber ? ` · ${matterRef.fileNumber}` : ''} sent to ${client?.name || 'client'}.`,
      actionUrl: deepLink,
      entityType: 'service_statement',
      entityId: statementId,
      actorId: userId,
      priority: 'normal',
      workflowCategory: 'sos',
      clientId,
      fileSource: matterScope?.fileSource,
      fileId: matterScope?.fileId,
      actions: [
        { id: 'open_matter', label: 'Open Matter', href: deepLink, variant: 'primary' },
      ],
    });

    if (client?.email) {
      await sendTransactionalEmail({
        to: client.email,
        subject: `Statement of Service — ${agency?.name || 'ImmiMate'}`,
        html: `<p>Dear ${client.name},</p><p>Please review and acknowledge your Statement of Service.</p><p><a href="${reviewUrl}">View and acknowledge</a></p>`,
        emailType: 'sos',
        agencyId,
      });
    }

    return { statement: data as ServiceStatement, reviewUrl };
  }

  async markViewed(token: string): Promise<ServiceStatement> {
    const statement = await this.getByToken(token);
    if (!statement) throw new Error('Statement not found');
    if (statement.status === 'acknowledged') return statement;
    if (statement.viewed_at && statement.status === 'viewed') return statement;

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('service_statements')
      .update({
        status: statement.status === 'sent' ? 'viewed' : statement.status,
        viewed_at: now,
        updated_at: now,
      })
      .eq('review_token', token)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ServiceStatement;
  }

  async acknowledgeByToken(token: string): Promise<ServiceStatement> {
    const statement = await this.getByToken(token);
    if (!statement) throw new Error('Statement not found');
    if (statement.acknowledged_at) return statement;
    if (!statement.client_id) throw new Error('Invalid statement');

    return this.acknowledge(
      statement.agency_id,
      statement.client_id,
      statement.id,
      { viaPortal: true },
    );
  }

  async acknowledge(
    agencyId: string,
    clientId: string,
    statementId: string,
    opts?: { userId?: string; viaPortal?: boolean },
  ): Promise<ServiceStatement> {
    const statement = await this.getOwned(agencyId, clientId, statementId);
    if (statement.acknowledged_at) return statement;

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('service_statements')
      .update({
        status: 'acknowledged',
        acknowledged_at: now,
        updated_at: now,
      })
      .eq('id', statementId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { DocumentAuditService } = await import('@/lib/audit/document-audit.service');
    const audit = new DocumentAuditService(this.supabase);
    await audit.record({
      agencyId,
      clientId,
      matterId: (statement as { matter_id?: string }).matter_id ?? null,
      documentType: 'statement_of_service',
      documentId: statementId,
      eventType: 'acknowledged',
      eventTimestamp: now,
      actorName: clientId ? undefined : undefined,
      provider: opts?.viaPortal ? 'client_portal' : 'immimate',
      metadata: { via_portal: Boolean(opts?.viaPortal) },
    });

    const admin = createAdminClient();
    const { data: client } = await this.supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();
    const { data: agency } = await this.supabase
      .from('agencies')
      .select('slug')
      .eq('id', agencyId)
      .single();

    const ackSource = opts?.viaPortal ? 'by client via portal' : 'recorded';
    const matterScope = resolveFileScopeFromStatement(statement);
    const matterRef = await this.resolveStatementMatterRef(agencyId, clientId, statement);
    const deepLink = matterScope
      ? buildMatterClientPath(
          agency?.slug || 'workspace',
          clientId,
          matterScope.fileSource,
          matterScope.fileId,
          'statement_of_service',
        )
      : buildWorkspaceActionUrl(
          agency?.slug || 'workspace',
          `/clients/${clientId}?tab=statement_of_service`,
        );

    await recordClientSystemNote(admin, {
      agencyId,
      clientId,
      actorUserId: opts?.userId,
      body: `Statement of Service ${statement.statement_number || statementId} acknowledged ${ackSource}.`,
      referenceType: 'service_statement',
      referenceId: statementId,
      fileSource: matterScope?.fileSource,
      fileId: matterScope?.fileId,
      metadata: {
        file_number: matterRef.fileNumber,
        file_source: matterScope?.fileSource,
        file_id: matterScope?.fileId,
      },
    });

    await maybeRecordClientCompleteNote(admin, agencyId, clientId, opts?.userId, {
      agreementId: statement.agreement_id,
      approvalId: statement.approval_id,
      fileSource: statement.approval_id
        ? 'application_approval'
        : statement.agreement_id
          ? 'agreement'
          : undefined,
      fileId: statement.approval_id || statement.agreement_id || undefined,
    });

    await admin.from('activity_logs').insert({
      agency_id: agencyId,
      user_id: opts?.userId || null,
      type: 'service_statement.acknowledged',
      title: 'Statement of Service acknowledged',
      description: `${statement.statement_number || statementId}${matterRef.fileNumber ? ` (${matterRef.fileNumber})` : ''} acknowledged by ${client?.name || 'client'}`,
      reference_id: statementId,
      reference_type: 'service_statement',
    });

    await recordComplianceEvent(admin, {
      agencyId,
      clientId,
      eventType: 'sos_acknowledged',
      fileSource: matterScope?.fileSource ?? null,
      fileId: matterScope?.fileId ?? null,
      actorUserId: opts?.userId ?? null,
      metadata: { statement_id: statementId, via_portal: Boolean(opts?.viaPortal) },
    });

    const notify = new NotificationService(admin);
    const notifyUserId = statement.created_by || opts?.userId;
    if (notifyUserId) {
      await notify.notify({
        agencyId,
        userId: notifyUserId,
        type: 'sos',
        title: 'Statement of Service acknowledged',
        message: `${statement.statement_number || 'SOS'}${matterRef.fileNumber ? ` · ${matterRef.fileNumber}` : ''} acknowledged by ${client?.name || 'client'}.`,
        actionUrl: deepLink,
        entityType: 'service_statement',
        entityId: statementId,
        priority: 'high',
        workflowCategory: 'sos',
        clientId,
        fileSource: matterScope?.fileSource,
        fileId: matterScope?.fileId,
        actions: [
          { id: 'open_matter', label: 'Open Matter', href: deepLink, variant: 'primary' },
        ],
      });
    }

    return data as ServiceStatement;
  }

  private async listItems(agencyId: string, statementId: string): Promise<ServiceStatementItem[]> {
    const { data, error } = await this.supabase
      .from('service_statement_items')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('statement_id', statementId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as ServiceStatementItem[];
  }

  private async saveServiceItems(
    agencyId: string,
    statementId: string,
    selectedIds: string[],
  ) {
    const catalog = new ServiceCatalogService(this.supabase);
    const all = await catalog.listAll();
    const byId = new Map(all.map((s) => [s.id, s]));

    await this.supabase
      .from('service_statement_items')
      .delete()
      .eq('statement_id', statementId)
      .eq('agency_id', agencyId);

    const rows = selectedIds
      .map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        return {
          agency_id: agencyId,
          statement_id: statementId,
          line_type: 'service',
          description: item.label,
          sort_order: index,
          metadata: { catalog_id: id, code: item.code },
        };
      })
      .filter(Boolean);

    if (rows.length) {
      const { error } = await this.supabase.from('service_statement_items').insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  private async nextStatementNumber(agencyId: string, clientId: string): Promise<string> {
    const { count } = await this.supabase
      .from('service_statements')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null);

    return `SOS-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  private async resolveMatterLinkIds(
    agencyId: string,
    clientId: string,
    opts?: {
      agreementId?: string | null;
      approvalId?: string | null;
      fileSource?: 'agreement' | 'application_approval';
      fileId?: string;
    },
  ): Promise<{ agreementIds: string[]; approvalIds: string[] }> {
    const agreementIds = new Set<string>();
    const approvalIds = new Set<string>();

    if (opts?.agreementId) agreementIds.add(opts.agreementId);
    if (opts?.approvalId) approvalIds.add(opts.approvalId);

    if (opts?.fileSource && opts?.fileId) {
      if (opts.fileSource === 'agreement') {
        agreementIds.add(opts.fileId);
        const { data: agr } = await this.supabase
          .from('agreements')
          .select('agreement_number')
          .eq('id', opts.fileId)
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .maybeSingle();
        if (agr?.agreement_number) {
          const { data: ap } = await this.supabase
            .from('application_approvals')
            .select('id')
            .eq('agency_id', agencyId)
            .eq('client_id', clientId)
            .eq('approval_number', agr.agreement_number)
            .is('deleted_at', null)
            .maybeSingle();
          if (ap?.id) approvalIds.add(ap.id);
        }
      } else {
        approvalIds.add(opts.fileId);
        const { data: ap } = await this.supabase
          .from('application_approvals')
          .select('approval_number')
          .eq('id', opts.fileId)
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .maybeSingle();
        if (ap?.approval_number) {
          const { data: agr } = await this.supabase
            .from('agreements')
            .select('id')
            .eq('agency_id', agencyId)
            .eq('client_id', clientId)
            .eq('agreement_number', ap.approval_number)
            .neq('status', 'cancelled')
            .maybeSingle();
          if (agr?.id) agreementIds.add(agr.id);
        }
      }
    }

    return {
      agreementIds: [...agreementIds],
      approvalIds: [...approvalIds],
    };
  }

  private async resolveStatementMatterRef(
    agencyId: string,
    clientId: string,
    statement: ServiceStatement,
  ): Promise<{
    fileNumber: string | null;
    fileSource: 'agreement' | 'application_approval' | null;
    fileId: string | null;
  }> {
    const scope = resolveFileScopeFromStatement(statement);
    if (statement.approval_id) {
      const { data } = await this.supabase
        .from('application_approvals')
        .select('approval_number')
        .eq('id', statement.approval_id)
        .eq('agency_id', agencyId)
        .maybeSingle();
      return {
        fileNumber: data?.approval_number || null,
        fileSource: scope?.fileSource || 'application_approval',
        fileId: scope?.fileId || statement.approval_id,
      };
    }
    if (statement.agreement_id) {
      const { data } = await this.supabase
        .from('agreements')
        .select('agreement_number')
        .eq('id', statement.agreement_id)
        .eq('agency_id', agencyId)
        .maybeSingle();
      return {
        fileNumber: data?.agreement_number || null,
        fileSource: scope?.fileSource || 'agreement',
        fileId: scope?.fileId || statement.agreement_id,
      };
    }
    return { fileNumber: null, fileSource: null, fileId: null };
  }

  private async getOwned(agencyId: string, clientId: string, statementId: string) {
    const { data, error } = await this.supabase
      .from('service_statements')
      .select('*')
      .eq('id', statementId)
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) throw new Error('Statement not found');
    return data as ServiceStatement;
  }

  /** @deprecated Use createDraft */
  async create(
    agencyId: string,
    userId: string,
    clientId: string,
    input: { issued_stage?: 'during_matter' | 'on_completion'; notes?: string },
  ) {
    return this.createDraft(agencyId, userId, {
      client_id: clientId,
      issued_stage: input.issued_stage,
      services_notes: input.notes,
    });
  }
}
