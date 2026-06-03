import { SupabaseClient } from '@supabase/supabase-js';
import { loadRmaSignatureForUser } from '@/lib/signatures/rma-signature';
import { DocumentGenerationService } from './document-generation.service';
import { AuditService } from './audit.service';
import { formatDisplayDateForSignature } from '@/features/agreements/lib/agreement-preview-html';

export type AgentSignatureApplyResult = {
  responsibleUserId: string;
  agentSignedAt: string;
  agentSignatureUrl: string | null;
  agentSignatureText: string | null;
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
      .select('id, agency_id, created_by, metadata')
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

    if (!signature) {
      throw new Error(
        'Responsible migration agent has no signature configured. Set up signature in RMA Team settings.',
      );
    }

    const signedAt = new Date().toISOString();
    const displayDate = formatDisplayDateForSignature(signedAt);

    const metadata = {
      ...((agreement.metadata as Record<string, unknown>) || {}),
      agent_signature_applied: true,
      agent_signature_applied_at: signedAt,
      agent_signature_display: {
        name: signature.fullName,
        marn: signature.marn,
        signedAt: displayDate,
        imageHtml: signature.imageHtml,
        mode: signature.mode,
      },
    };

    await this.supabase
      .from('agreements')
      .update({
        agent_signed_at: signedAt,
        agent_signature_url: signature.signatureUrl,
        agent_signature_text: signature.signatureText,
        agent_signer_user_id: responsibleUserId,
        metadata,
      })
      .eq('id', agreementId);

    await this.docService.regenerateAgreementPdf(agencyId, userId, agreementId);

    await this.auditService.logEvent(
      agencyId,
      userId,
      agreementId,
      'Agent signature automatically applied at send time.',
      {
        responsible_user_id: responsibleUserId,
        agent_signed_at: signedAt,
        signature_mode: signature.mode,
      },
    );

    return {
      responsibleUserId,
      agentSignedAt: signedAt,
      agentSignatureUrl: signature.signatureUrl,
      agentSignatureText: signature.signatureText,
    };
  }
}
