import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientSosContext } from '../types';

function parseFee(value: unknown): number {
  const n = parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

export type SosContextOptions = {
  fileSource?: 'agreement' | 'application_approval';
  fileId?: string;
  agreementId?: string | null;
  approvalId?: string | null;
};

export async function getClientSosContext(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
  opts?: SosContextOptions,
): Promise<ClientSosContext> {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, email, phone, client_number')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error || !client) throw new Error('Client not found');

  let agreement: {
    id: string;
    status?: string | null;
    metadata?: unknown;
    completed_at?: string | null;
    agreement_number?: string | null;
    matter_type_id?: string | null;
  } | null = null;

  let approval: {
    id: string;
    visa_subclass?: string | null;
    approval_number?: string | null;
    matter_type_id?: string | null;
  } | null = null;

  if (opts?.agreementId) {
    const { data } = await supabase
      .from('agreements')
      .select('id, status, metadata, completed_at, agreement_number, matter_type_id')
      .eq('id', opts.agreementId)
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .maybeSingle();
    agreement = data;
  } else if (opts?.approvalId) {
    const { data } = await supabase
      .from('application_approvals')
      .select('id, visa_subclass, approval_number, matter_type_id')
      .eq('id', opts.approvalId)
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .maybeSingle();
    approval = data;
  } else if (opts?.fileSource && opts?.fileId) {
    if (opts.fileSource === 'agreement') {
      const { data } = await supabase
        .from('agreements')
        .select('id, status, metadata, completed_at, agreement_number, matter_type_id')
        .eq('id', opts.fileId)
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .maybeSingle();
      agreement = data;
      if (data?.agreement_number) {
        const { data: linked } = await supabase
          .from('application_approvals')
          .select('id, visa_subclass, approval_number, matter_type_id')
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .eq('approval_number', data.agreement_number)
          .is('deleted_at', null)
          .maybeSingle();
        approval = linked;
      }
    } else {
      const { data } = await supabase
        .from('application_approvals')
        .select('id, visa_subclass, approval_number, matter_type_id')
        .eq('id', opts.fileId)
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .maybeSingle();
      approval = data;
      if (data?.approval_number) {
        const { data: linked } = await supabase
          .from('agreements')
          .select('id, status, metadata, completed_at, agreement_number, matter_type_id')
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .eq('agreement_number', data.approval_number)
          .neq('status', 'cancelled')
          .maybeSingle();
        agreement = linked;
      }
    }
  }

  if (!agreement && !approval) {
    const { data: agreements } = await supabase
      .from('agreements')
      .select('id, status, metadata, completed_at, agreement_number, matter_type_id, created_at')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10);

    agreement =
      (agreements || []).find(
        (a) => a.status === 'signed' || a.status === 'completed' || a.completed_at,
      ) || agreements?.[0] || null;

    if (!approval && agreement?.agreement_number) {
      const { data: linked } = await supabase
        .from('application_approvals')
        .select('id, visa_subclass, approval_number, matter_type_id')
        .eq('agency_id', agencyId)
        .eq('client_id', clientId)
        .eq('approval_number', agreement.agreement_number)
        .is('deleted_at', null)
        .maybeSingle();
      approval = linked;
    }
  }

  const meta = (agreement?.metadata || {}) as Record<string, unknown>;
  const wizard = (meta.wizard_form || meta) as Record<string, unknown>;

  let professionalFee = parseFee(wizard.professionalFee);
  let disbursements = parseFee(wizard.estimatedDisbursements);
  let governmentFee = parseFee(wizard.governmentFee ?? wizard.estimatedGovernmentFees);

  if (agreement?.id) {
    const { data: schedule } = await supabase
      .from('payment_schedules')
      .select('total_amount, metadata')
      .eq('agreement_id', agreement.id)
      .maybeSingle();

    if (schedule?.total_amount != null) {
      professionalFee = parseFee(schedule.total_amount);
    }
    const schedMeta = (schedule?.metadata || {}) as Record<string, unknown>;
    if (schedMeta.disbursements != null) disbursements = parseFee(schedMeta.disbursements);
    if (schedMeta.government_fee != null) governmentFee = parseFee(schedMeta.government_fee);
  }

  const visaSubclass =
    approval?.visa_subclass ||
    (meta.visa_subclass as string) ||
    (wizard.visaSubclass as string) ||
    null;

  const fileSource: ClientSosContext['file_source'] = approval
    ? 'application_approval'
    : agreement
      ? 'agreement'
      : null;
  const fileId = approval?.id || agreement?.id || null;
  const fileNumber = approval?.approval_number || agreement?.agreement_number || null;

  return {
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      client_number: client.client_number,
    },
    visa_subclass: visaSubclass,
    agreement_id: agreement?.id || null,
    approval_id: approval?.id || null,
    file_source: fileSource,
    file_id: fileId,
    file_number: fileNumber,
    fees: {
      professional_fee: professionalFee,
      government_fee: governmentFee,
      disbursements,
      quoted_professional_fee: professionalFee,
    },
  };
}
