import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildMatterClientPath,
  groupFilesIntoMatterUnits,
  isMatterCompleteFromRecords,
  resolveFileScopeFromStatement,
  resolveMatterScope,
  type MatterAgreementRecord,
  type MatterApprovalRecord,
  type MatterStatementRecord,
} from '@/features/clients/lib/matter-scope';
import {
  NotificationService,
  buildWorkspaceActionUrl,
} from '@/lib/notifications/notification.service';
import { buildFileNotesExportTxt } from './file-notes-export.service';
import { recordComplianceEvent } from '@/lib/compliance/compliance-events.service';
import { formatFileNotesExportFilename } from '@/lib/documents/document-naming';
import { ClientFilesService, type ClientFileSource } from './client-files.service';
import type { FileNote, FileNotesListResult, NoteTypeRecord, RecordSystemNoteInput } from '../types';

const DEFAULT_PAGE_SIZE = 20;

export class FileNotesService {
  constructor(private supabase: SupabaseClient) {}

  async listNoteTypes(): Promise<NoteTypeRecord[]> {
    const { data, error } = await this.supabase
      .from('note_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as NoteTypeRecord[];
  }

  async listForFile(
    agencyId: string,
    clientId: string,
    fileSource: ClientFileSource,
    fileId: string,
    options?: {
      noteType?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<FileNotesListResult> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const filesService = new ClientFilesService(this.supabase);
    await filesService.resolveFile(agencyId, clientId, fileSource, fileId);

    let query = this.supabase
      .from('file_notes')
      .select('*, users:created_by(full_name)', { count: 'exact' })
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('file_source', fileSource)
      .eq('file_id', fileId)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.noteType && options.noteType !== 'all') {
      if (options.noteType === 'system') {
        query = query.eq('is_system_note', true);
      } else {
        query = query.eq('note_type', options.noteType).eq('is_system_note', false);
      }
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const notes = (data || []).map((row: Record<string, unknown>) => ({
      ...(row as FileNote),
      author_name: (row.users as { full_name?: string } | null)?.full_name ?? null,
    }));

    const total = count ?? 0;
    return {
      notes,
      total,
      page,
      limit,
      has_more: offset + notes.length < total,
    };
  }

  async addManualNote(
    agencyId: string,
    clientId: string,
    userId: string,
    input: {
      note_type: string;
      body: string;
      file_source: ClientFileSource;
      file_id: string;
    },
  ): Promise<FileNote> {
    const filesService = new ClientFilesService(this.supabase);
    await filesService.resolveFile(agencyId, clientId, input.file_source, input.file_id);

    const { data: manualTypes } = await this.supabase
      .from('note_types')
      .select('code')
      .eq('is_manual', true);

    const allowed = new Set((manualTypes || []).map((t) => t.code));
    if (!allowed.has(input.note_type)) {
      throw new Error('Invalid note type');
    }

    const { data, error } = await this.supabase
      .from('file_notes')
      .insert({
        agency_id: agencyId,
        client_id: clientId,
        file_source: input.file_source,
        file_id: input.file_id,
        created_by: userId,
        note_type: input.note_type,
        body: input.body.trim(),
        is_system_note: false,
      })
      .select('*, users:created_by(full_name)')
      .single();

    if (error) throw new Error(error.message);

    const note = {
      ...(data as FileNote),
      author_name: (data as { users?: { full_name?: string } }).users?.full_name ?? null,
    };

    await recordComplianceEvent(this.supabase, {
      agencyId,
      clientId,
      eventType: 'note_added',
      fileSource: input.file_source,
      fileId: input.file_id,
      actorUserId: userId,
      metadata: { note_id: note.id, note_type: input.note_type },
    });

    return note;
  }

  async exportAuditTxt(
    agencyId: string,
    clientId: string,
    exportedByName: string,
    fileSource: ClientFileSource,
    fileId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { data: client } = await this.supabase
      .from('clients')
      .select('id, name, email, phone, client_number')
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (!client) throw new Error('Client not found');

    const filesService = new ClientFilesService(this.supabase);
    const file = await filesService.resolveFile(agencyId, clientId, fileSource, fileId);

    const { data: agency } = await this.supabase
      .from('agencies')
      .select('name')
      .eq('id', agencyId)
      .single();

    const noteTypes = await this.listNoteTypes();
    const { notes } = await this.listForFile(agencyId, clientId, fileSource, fileId, {
      page: 1,
      limit: 10_000,
    });

    const exportedAt = new Date().toISOString();
    const text = buildFileNotesExportTxt({
      agencyName: agency?.name || 'Agency',
      clientName: client.name,
      fileNumber: file.file_number,
      visaSubclass: file.visa_subclass,
      clientEmail: client.email,
      clientPhone: client.phone,
      notes,
      noteTypes,
      exportedBy: exportedByName,
      exportedAt,
    });

    const buffer = Buffer.from(text, 'utf-8');
    const filename = formatFileNotesExportFilename(file.file_number, new Date(exportedAt));

    await recordComplianceEvent(this.supabase, {
      agencyId,
      clientId,
      eventType: 'notes_exported',
      fileSource,
      fileId,
      metadata: { file_number: file.file_number, note_count: notes.length },
    });

    return { buffer, filename };
  }
}

async function resolveFileScope(
  admin: SupabaseClient,
  input: RecordSystemNoteInput,
): Promise<{ fileSource: ClientFileSource | null; fileId: string | null }> {
  if (input.fileSource && input.fileId) {
    return { fileSource: input.fileSource, fileId: input.fileId };
  }

  if (
    input.referenceType === 'agreement' ||
    input.referenceType === 'application_approval'
  ) {
    return {
      fileSource: input.referenceType,
      fileId: input.referenceId ?? null,
    };
  }

  if (input.referenceType === 'service_statement' && input.referenceId) {
    const { data: statement } = await admin
      .from('service_statements')
      .select('agreement_id, approval_id')
      .eq('id', input.referenceId)
      .eq('agency_id', input.agencyId)
      .maybeSingle();

    if (statement) {
      const scope = resolveFileScopeFromStatement(statement);
      if (scope) return scope;
    }
  }

  const filesService = new ClientFilesService(admin);
  const files = await filesService.listClientFiles(input.agencyId, input.clientId, {
    activeOnly: true,
  });
  if (files.length > 0) {
    return { fileSource: files[0].source, fileId: files[0].id };
  }

  return { fileSource: null, fileId: null };
}

/**
 * Records an immutable system event on the file compliance timeline.
 */
export async function recordClientSystemNote(
  admin: SupabaseClient,
  input: RecordSystemNoteInput,
): Promise<void> {
  const scope = await resolveFileScope(admin, input);

  const { error } = await admin.from('file_notes').insert({
    agency_id: input.agencyId,
    client_id: input.clientId,
    file_source: scope.fileSource,
    file_id: scope.fileId,
    created_by: input.actorUserId ?? null,
    note_type: input.noteType ?? 'system',
    body: input.body.trim(),
    recorded_at: input.recordedAt ?? new Date().toISOString(),
    is_system_note: true,
    reference_type: input.referenceType ?? null,
    reference_id: input.referenceId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('FILE_NOTE_SYSTEM_INSERT_FAILED', error.message);
  }
}

export type MatterCompleteScope = {
  agreementId?: string | null;
  approvalId?: string | null;
  fileSource?: 'agreement' | 'application_approval';
  fileId?: string;
};

async function maybeRecordAllMattersClientNote(
  admin: SupabaseClient,
  agencyId: string,
  clientId: string,
  actorUserId: string | null | undefined,
  agrRows: MatterAgreementRecord[],
  apRows: MatterApprovalRecord[],
  stmtRows: MatterStatementRecord[],
  link?: { fileSource?: ClientFileSource; fileId?: string },
): Promise<void> {
  const filesService = new ClientFilesService(admin);
  const activeMatters = await filesService.listClientFiles(agencyId, clientId, {
    activeOnly: true,
  });
  const matterUnits = groupFilesIntoMatterUnits(activeMatters);
  const allMattersComplete =
    matterUnits.length > 0 &&
    matterUnits.every((unit) =>
      resolveMatterScope(unit, agrRows, apRows, stmtRows).isComplete,
    );
  if (!allMattersComplete) return;

  const { data: clientCompleteNote } = await admin
    .from('file_notes')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .eq('is_system_note', true)
    .ilike('body', '%All matters for this client are now complete%')
    .limit(1);

  if (clientCompleteNote?.length) return;

  await recordClientSystemNote(admin, {
    agencyId,
    clientId,
    actorUserId,
    body: `All matters for this client are now complete.`,
    fileSource: link?.fileSource,
    fileId: link?.fileId,
    metadata: { client_fully_complete: true },
  });
}

export async function maybeRecordClientCompleteNote(
  admin: SupabaseClient,
  agencyId: string,
  clientId: string,
  actorUserId?: string | null,
  matterScope?: MatterCompleteScope,
): Promise<void> {
  if (!matterScope?.agreementId && !matterScope?.approvalId) return;

  const [{ data: agreements }, { data: approvals }, { data: statements }, { data: client }] =
    await Promise.all([
      admin
        .from('agreements')
        .select(
          'id, agreement_number, status, completed_at, sent_at, metadata, created_at',
        )
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .neq('status', 'cancelled'),
      admin
        .from('application_approvals')
        .select(
          'id, approval_number, status, lodged_at, client_signed_at, client_sent_at, matter_completed_at',
        )
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .is('deleted_at', null),
      admin
        .from('service_statements')
        .select('id, agreement_id, approval_id, status, acknowledged_at, sent_at, created_at')
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .is('deleted_at', null),
      admin.from('clients').select('name').eq('id', clientId).eq('agency_id', agencyId).maybeSingle(),
    ]);

  const agrRows = (agreements || []) as MatterAgreementRecord[];
  const apRows = (approvals || []) as MatterApprovalRecord[];
  const stmtRows = (statements || []) as MatterStatementRecord[];

  const isComplete = isMatterCompleteFromRecords(
    matterScope.agreementId ?? null,
    matterScope.approvalId ?? null,
    agrRows,
    apRows,
    stmtRows,
  );

  if (!isComplete) return;

  let hasMatterNote = false;
  if (matterScope.fileSource && matterScope.fileId) {
    const { data: existing } = await admin
      .from('file_notes')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('file_source', matterScope.fileSource)
      .eq('file_id', matterScope.fileId)
      .eq('is_system_note', true)
      .ilike('body', '%marked complete%')
      .limit(1);
    hasMatterNote = Boolean(existing?.length);
  }

  const targetApproval = matterScope.approvalId
    ? apRows.find((a) => a.id === matterScope.approvalId)
    : apRows.find((a) => a.status === 'lodged' || Boolean(a.lodged_at));

  const targetAgreement = matterScope.agreementId
    ? agrRows.find((a) => a.id === matterScope.agreementId)
    : null;

  const fileNumber =
    targetApproval?.approval_number ||
    targetAgreement?.agreement_number ||
    null;

  const fileSource =
    matterScope.fileSource ||
    (matterScope.approvalId ? 'application_approval' : 'agreement');
  const fileId =
    matterScope.fileId || matterScope.approvalId || matterScope.agreementId || undefined;

  if (!hasMatterNote) {
    const completedAt = new Date().toISOString();

    if (matterScope.approvalId) {
      const { error: persistErr } = await admin
        .from('application_approvals')
        .update({
          matter_completed_at: completedAt,
          matter_completed_by: actorUserId ?? null,
          matter_completion_reason: 'all_gates_satisfied',
        })
        .eq('id', matterScope.approvalId)
        .eq('agency_id', agencyId)
        .is('matter_completed_at', null);
      if (persistErr) {
        console.error('MATTER_COMPLETION_PERSIST_FAILED', persistErr.message);
      }
    }

    const { data: agency } = await admin
      .from('agencies')
      .select('slug')
      .eq('id', agencyId)
      .maybeSingle();

    const workspaceSlug = agency?.slug || 'workspace';
    const deepLink = fileSource && fileId
      ? buildMatterClientPath(workspaceSlug, clientId, fileSource, fileId, 'completion')
      : buildWorkspaceActionUrl(workspaceSlug, `/clients/${clientId}?tab=completion`);

    await recordClientSystemNote(admin, {
      agencyId,
      clientId,
      actorUserId,
      body: `Matter ${fileNumber || 'file'} marked complete — all workflow gates satisfied.`,
      referenceType: targetApproval ? 'application_approval' : 'agreement',
      referenceId: targetApproval?.id || targetAgreement?.id,
      fileSource,
      fileId,
      metadata: {
        file_number: fileNumber,
        file_source: fileSource,
        file_id: fileId,
        matter_completed_at: completedAt,
      },
    });

    await recordComplianceEvent(admin, {
      agencyId,
      clientId,
      eventType: 'matter_completed',
      fileSource,
      fileId: fileId ?? null,
      actorUserId,
      metadata: { file_number: fileNumber, completed_at: completedAt },
    });

    const notify = new NotificationService(admin);
    if (actorUserId) {
      await notify.notify({
        agencyId,
        userId: actorUserId,
        type: 'system',
        title: 'Matter completed',
        message: `${fileNumber || 'Matter'}${client?.name ? ` · ${client.name}` : ''} — all workflow gates satisfied.`,
        actionUrl: deepLink,
        entityType: 'application_approval',
        entityId: matterScope.approvalId || matterScope.agreementId || clientId,
      });
    }
  }

  await maybeRecordAllMattersClientNote(
    admin,
    agencyId,
    clientId,
    actorUserId,
    agrRows,
    apRows,
    stmtRows,
    { fileSource, fileId },
  );
}
