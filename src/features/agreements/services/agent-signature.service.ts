import { loadRmaSignatureForUser } from '@/lib/signatures/rma-signature';
import { recordAgreementSigningAudit } from '@/features/agreements/lib/agreement-signing-audit';
import { formatDisplayDateForSignature } from '@/features/agreements/lib/agreement-preview-html';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { AuditService } from '@/features/agreements/services/audit.service';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AgentSignatureApplyResult = {
  responsibleUserId: string;
  agentSignedAt: string;
  agentSignatureUrl: string | null;
  agentSignatureText: string | null;
  signatureEmbedded: boolean;
};

export class AgentSignatureService {
  private auditService: AuditService;
  private docService: DocumentGenerationService;

  constructor(private readonly supabase: SupabaseClient) {
    this.auditService = new AuditService(supabase);
    this.docService = new DocumentGenerationService(supabase);
  }

  async applyAgentSignatureOnSend(
    agencyId: string,
    userId: string,
    agreementId: string,
  ): Promise<AgentSignatureApplyResult> {
    const { data: agreement, error } = await this.supabase
      .from('agreements')
      .select('id, agency_id, client_id, matter_id, created_by, metadata')
      .eq('id', agreementId)
      .eq('agency_id', agencyId)
      .single();

    if (error || !agreement) throw new Error('Agreement not found');

    const responsibleUserId =
      (agreement.metadata as { responsible_rma_id?: string })?.responsible_rma_id ||
      agreement.created_by;

    const signature = await loadRmaSignatureForUser(
      this.supabase,
      agencyId,
      responsibleUserId,
    );

    const signedAt = new Date().toISOString();
    const displayDate = formatDisplayDateForSignature(signedAt);
    const hasUploadImage =
      signature?.mode === 'upload' &&
      Boolean(signature.signatureUrl) &&
      signature.imageHtml.includes('<img');
    const signatureEmbedded = hasUploadImage;

    const metadata = {
      ...((agreement.metadata as Record<string, unknown>) || {}),
      agent_signature_applied: true,
      agent_signature_applied_at: signedAt,
      agent_signature_embedded: signatureEmbedded,
      agent_signature_display: signature
        ? {
            name: signature.fullName,
            marn: signature.marn,
            signedAt: displayDate,
            imageHtml: hasUploadImage ? signature.imageHtml : null,
            mode: signature.mode,
          }
        : null,
    };

    await this.supabase
      .from('agreements')
      .update({
        agent_signed_at: signedAt,
        agent_signature_url: signature?.signatureUrl ?? null,
        agent_signature_text: signature?.signatureText ?? null,
        agent_signer_user_id: responsibleUserId,
        metadata,
      })
      .eq('id', agreementId);

    await this.docService.regenerateAgreementPdf(agencyId, userId, agreementId);

    if (signatureEmbedded && signature?.signatureUrl) {
      await recordAgreementSigningAudit(this.supabase, {
        id: agreementId,
        agency_id: agencyId,
        client_id: agreement.client_id,
        matter_id: agreement.matter_id,
      }, 'completed', {
        eventTimestamp: signedAt,
        metadata: {
          action: 'agent_signature_embedded',
          user_id: responsibleUserId,
          signature_storage_path: signature.signatureUrl,
          agreement_id: agreementId,
        },
      });
    }

    await this.auditService.logEvent(
      agencyId,
      userId,
      agreementId,
      signatureEmbedded
        ? 'Agent signature image embedded in agreement PDF at send time.'
        : 'Agreement sent without uploaded agent signature image (name/MARN/date fallback).',
      {
        responsible_user_id: responsibleUserId,
        agent_signed_at: signedAt,
        signature_mode: signature?.mode ?? null,
        signature_embedded: signatureEmbedded,
      },
    );

    return {
      responsibleUserId,
      agentSignedAt: signedAt,
      agentSignatureUrl: signature?.signatureUrl ?? null,
      agentSignatureText: signature?.signatureText ?? null,
      signatureEmbedded,
    };
  }
}
