import type { SupabaseClient } from '@supabase/supabase-js';

export type ClientFileSource = 'agreement' | 'application_approval';

export type ClientFile = {
  id: string;
  source: ClientFileSource;
  file_number: string;
  visa_subclass: string | null;
  matter_label: string | null;
  display_label: string;
  short_label: string;
  status: string;
  is_active: boolean;
  created_at: string;
};

function normalizeVisaSubclass(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.trim().replace(/^SC\s*/i, '');
  return cleaned ? `SC ${cleaned}` : null;
}

function buildDisplayLabel(
  fileNumber: string,
  visaSubclass: string | null,
  matterLabel: string | null,
): { display_label: string; short_label: string } {
  const visa = visaSubclass || '';
  const matter = matterLabel || '';
  const detail = [visa, matter].filter(Boolean).join(' — ');
  const display_label = detail ? `${fileNumber} — ${detail}` : fileNumber;
  const short_label = [visa, matter].filter(Boolean).join(' ');
  return { display_label, short_label };
}

function extractAgreementVisa(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const raw =
    (m.visaSubclass as string | undefined) ||
    (m.visa_subclass as string | undefined) ||
    (m.visaSubclass as string | undefined);
  return normalizeVisaSubclass(raw);
}

export class ClientFilesService {
  constructor(private supabase: SupabaseClient) {}

  async countActiveFiles(agencyId: string, clientId: string): Promise<number> {
    const files = await this.listClientFiles(agencyId, clientId, { activeOnly: true });
    return files.length;
  }

  async countActiveFilesForClients(
    agencyId: string,
    clientIds: string[],
  ): Promise<Record<string, number>> {
    if (clientIds.length === 0) return {};
    const counts: Record<string, number> = {};
    await Promise.all(
      clientIds.map(async (id) => {
        counts[id] = await this.countActiveFiles(agencyId, id);
      }),
    );
    return counts;
  }

  async listClientFiles(
    agencyId: string,
    clientId: string,
    options?: { activeOnly?: boolean },
  ): Promise<ClientFile[]> {
    const activeOnly = options?.activeOnly ?? false;

    const { data: client } = await this.supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (!client) throw new Error('Client not found');

    const matterTypeIds = new Set<string>();

    const { data: agreements } = await this.supabase
      .from('agreements')
      .select('id, agreement_number, status, metadata, matter_type_id, visa_stream, created_at')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    const { data: approvals } = await this.supabase
      .from('application_approvals')
      .select('id, approval_number, title, status, visa_subclass, matter_type_id, created_at')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    for (const row of agreements || []) {
      if (row.matter_type_id) matterTypeIds.add(row.matter_type_id);
    }
    for (const row of approvals || []) {
      if (row.matter_type_id) matterTypeIds.add(row.matter_type_id);
    }

    const matterNames: Record<string, string> = {};
    if (matterTypeIds.size > 0) {
      const { data: matterTypes } = await this.supabase
        .from('matter_types')
        .select('id, name')
        .in('id', Array.from(matterTypeIds));
      for (const mt of matterTypes || []) {
        matterNames[mt.id] = mt.name;
      }
    }

    const files: ClientFile[] = [];

    for (const row of agreements || []) {
      const fileNumber = row.agreement_number || 'Agreement';
      const visa = extractAgreementVisa(row.metadata);
      const matter = row.matter_type_id ? matterNames[row.matter_type_id] || null : null;
      const { display_label, short_label } = buildDisplayLabel(fileNumber, visa, matter);
      const isActive = row.status !== 'cancelled';
      if (activeOnly && !isActive) continue;
      files.push({
        id: row.id,
        source: 'agreement',
        file_number: fileNumber,
        visa_subclass: visa,
        matter_label: matter,
        display_label,
        short_label,
        status: row.status || 'draft',
        is_active: isActive,
        created_at: row.created_at,
      });
    }

    for (const row of approvals || []) {
      const fileNumber = row.approval_number || row.title || 'Application';
      const visa = normalizeVisaSubclass(row.visa_subclass);
      const matter = row.matter_type_id ? matterNames[row.matter_type_id] || null : null;
      const { display_label, short_label } = buildDisplayLabel(fileNumber, visa, matter);
      const isActive = row.status !== 'closed';
      if (activeOnly && !isActive) continue;
      files.push({
        id: row.id,
        source: 'application_approval',
        file_number: fileNumber,
        visa_subclass: visa,
        matter_label: matter,
        display_label,
        short_label,
        status: row.status || 'draft',
        is_active: isActive,
        created_at: row.created_at,
      });
    }

    files.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return files;
  }

  async resolveFile(
    agencyId: string,
    clientId: string,
    fileSource: ClientFileSource,
    fileId: string,
  ): Promise<ClientFile> {
    const files = await this.listClientFiles(agencyId, clientId);
    const match = files.find((f) => f.source === fileSource && f.id === fileId);
    if (!match) throw new Error('File not found for this client');
    return match;
  }
}
