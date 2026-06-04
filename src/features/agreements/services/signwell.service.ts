import { SupabaseClient } from '@supabase/supabase-js';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus } from '../types';
import { Role } from '@/features/auth/types/roles';
import { AuditService } from './audit.service';
import { assertUuid } from '@/lib/validation/uuid';
import { redactSensitiveValue } from '@/lib/security/sanitize';
import { buildSignersFromWizard } from '../lib/wizard-signers';
import { AgentSignatureService } from './agent-signature.service';
import { buildSignwellDispatchExtras } from '@/lib/signwell/dispatch-extras';
import { signwellTestMode } from '@/lib/signwell/test-mode';
import { createAndSendSignwellDocument } from '@/lib/signwell/document-dispatch';
import { buildDocumentSignatureFields } from '@/lib/signwell/signature-fields';
import { countPdfPages } from '@/lib/pdf/page-count';

const SIGNWELL_ROLE_LABELS: Record<string, string> = {
  primary_applicant: 'Primary Applicant',
  secondary_applicant: 'Secondary Applicant',
  sponsor: 'Sponsor',
  dependant_1: 'Dependant 1',
  dependant_2: 'Dependant 2',
  dependant_3: 'Dependant 3',
};

function signwellRoleLabel(role: string): string {
  if (SIGNWELL_ROLE_LABELS[role]) return SIGNWELL_ROLE_LABELS[role];
  if (role.startsWith('dependant_')) {
    const n = role.replace('dependant_', '');
    return `Dependant ${n}`;
  }
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export class SignWellService {
  private agreementRepo: AgreementRepository;
  private auditService: AuditService;

  constructor(private supabase: SupabaseClient) {
    this.agreementRepo = new AgreementRepository(supabase);
    this.auditService = new AuditService(supabase);
  }

  async sendForSignature(agencyId: string, userId: string, role: Role, agreementId: string) {
    assertUuid(agencyId, 'agency_id');
    assertUuid(userId, 'user_id');
    assertUuid(agreementId, 'agreement_id');

    const agreement = await this.agreementRepo.getById(agreementId);
    if (!agreement || agreement.agency_id !== agencyId) throw new Error("Agreement not found");
    
    AgreementStateMachine.validateTransition(agreement.status, AgreementStatus.SENT);

    const agentSigService = new AgentSignatureService(this.supabase);
    await agentSigService.applyAgentSignatureOnSend(agencyId, userId, agreementId);

    const { data: docs } = await this.supabase
      .from('documents')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!docs || docs.length === 0) throw new Error("Generated document not found");
    const document = docs[0];

    const { data: urlData } = await this.supabase.storage
      .from('secure_documents')
      .createSignedUrl(document.file_url, 3600);
      
    if (!urlData?.signedUrl) throw new Error("Could not generate signed URL for document");

    let lastPage = Math.max(1, Number(document.page_count) || 1);
    if (!document.page_count) {
      try {
        const pdfRes = await fetch(urlData.signedUrl);
        if (pdfRes.ok) {
          const buf = Buffer.from(await pdfRes.arrayBuffer());
          lastPage = countPdfPages(buf);
          await this.supabase
            .from('documents')
            .update({ page_count: lastPage })
            .eq('id', document.id);
        }
      } catch {
        /* keep lastPage = 1 */
      }
    }

    const { data: client } = await this.supabase.from('clients').select('name, email').eq('id', agreement.client_id).single();
    if (!client) throw new Error("Client not found for agreement");

    const { data: externalSigners } = await this.supabase
      .from('signers')
      .select('role, full_name, email')
      .eq('agreement_id', agreementId);

    const metadata = (agreement.metadata as Record<string, unknown>) || {};
    const wizardForm = metadata.wizard_form as Record<string, unknown> | undefined;
    const dispatchOptions = metadata.dispatch_options as Record<string, unknown> | undefined;
    const wizardSigners = wizardForm ? buildSignersFromWizard(wizardForm as any) : [];

    const { data: senderUser } = await this.supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const signwellSigners: Array<{
      id: string;
      name: string;
      email: string;
      routing_order: number;
      role: string;
    }> = [];
    const seenEmails = new Set<string>();

    const addSigner = (id: string, name: string, email: string, swRole: string, routingOrder: number) => {
      const normalized = email?.trim().toLowerCase();
      if (!name?.trim() || !normalized || seenEmails.has(normalized)) return;
      seenEmails.add(normalized);
      signwellSigners.push({
        id,
        name: name.trim(),
        email: normalized,
        routing_order: routingOrder,
        role: swRole,
      });
    };

    const primary = wizardSigners.find((s) => s.role === 'primary_applicant');
    addSigner(
      'primary_applicant',
      primary?.name || client.name,
      primary?.email || client.email,
      'Primary Applicant',
      1
    );

    if (externalSigners?.length) {
      externalSigners.forEach((s: any, idx: number) => {
        addSigner(
          `signer_${idx}`,
          s.full_name,
          s.email,
          signwellRoleLabel(s.role || 'signer'),
          1
        );
      });
    } else {
      wizardSigners
        .filter((s) => s.role !== 'primary_applicant')
        .forEach((s, idx) => {
          addSigner(`wizard_${idx}`, s.name, s.email, s.signwellRole, 1);
        });
    }

    // Agent/RMA signature is embedded in the PDF — only external recipients sign via SignWell.

    const dispatchExtras = buildSignwellDispatchExtras(
      {
        wizardForm,
        dispatchOptions,
        agreementTitle: agreement.title,
        sender: {
          email: senderUser?.email || '',
          name: senderUser?.full_name || '',
        },
      },
      signwellSigners.map((s) => s.email),
    );

    const payload = {
      test_mode: signwellTestMode(),
      name: agreement.title,
      files: [{ name: 'Agreement.pdf', file_url: urlData.signedUrl }],
      recipients: signwellSigners,
      expires_in: 30,
      with_signature_page: false,
      text_tags: true,
      fields: buildDocumentSignatureFields(
        signwellSigners.map((s) => ({ id: s.id, name: s.name, email: s.email })),
        { lastPage },
      ),
      ...dispatchExtras,
    };

    console.log('SIGNWELL_DISPATCH_START', redactSensitiveValue({
      name: payload.name,
      fileCount: payload.files.length,
      recipients: payload.recipients.map((recipient) => ({
        id: recipient.id,
        routing_order: recipient.routing_order,
        role: recipient.role,
      })),
      test_mode: payload.test_mode,
    }));

    const sentDoc = await createAndSendSignwellDocument(payload as any);
    console.log('SIGNWELL_SEND_SUCCESS', redactSensitiveValue({ id: sentDoc.id, status: sentDoc.status }));

    await this.agreementRepo.update(agreementId, {
      status: AgreementStatus.SENT,
      signwell_document_id: sentDoc.id,
      sent_at: new Date().toISOString(),
    });

    await this.auditService.logEvent(agencyId, userId, agreementId, 'Agreement Sent for Signature', {
      signwell_document_id: sentDoc.id,
      external_signers_only: true,
    });

    return sentDoc;
  }
}
