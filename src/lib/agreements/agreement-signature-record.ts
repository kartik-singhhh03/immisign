import type { SupabaseClient } from '@supabase/supabase-js';

export type RecordAgreementSignatureInput = {
  agreementId: string;
  signerEmail: string;
  signerId?: string | null;
  signedAt: string;
  ipAddress?: string | null;
  provider?: string;
  providerDocumentId: string;
  webhookEventId?: string | null;
  signwellSignerId?: string | null;
  signerRole?: string;
};

/**
 * Idempotent insert — duplicate webhooks for the same signer/document do not create extra rows.
 */
export async function recordAgreementSignature(
  supabase: SupabaseClient,
  input: RecordAgreementSignatureInput,
): Promise<string | null> {
  const provider = input.provider ?? 'signwell';
  const signerEmail = input.signerEmail.trim().toLowerCase();

  try {
    const { data: existing } = await supabase
      .from('agreement_signatures')
      .select('id')
      .eq('agreement_id', input.agreementId)
      .eq('provider', provider)
      .eq('provider_document_id', input.providerDocumentId)
      .eq('signer_email', signerEmail)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data, error } = await supabase
      .from('agreement_signatures')
      .insert({
        agreement_id: input.agreementId,
        signer_role: input.signerRole ?? 'client',
        signwell_signer_id: input.signwellSignerId ?? null,
        signer_id: input.signerId ?? null,
        signer_email: signerEmail,
        signed_at: input.signedAt,
        ip_address: input.ipAddress ?? null,
        provider,
        provider_document_id: input.providerDocumentId,
        webhook_event_id: input.webhookEventId ?? null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: dup } = await supabase
          .from('agreement_signatures')
          .select('id')
          .eq('agreement_id', input.agreementId)
          .eq('provider', provider)
          .eq('provider_document_id', input.providerDocumentId)
          .eq('signer_email', signerEmail)
          .maybeSingle();
        return dup?.id ?? null;
      }
      console.warn('[agreement-signature-record] insert failed:', error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (e) {
    console.warn('[agreement-signature-record] exception:', e);
    return null;
  }
}
