import { SupabaseClient } from '@supabase/supabase-js';
import { signwellClient } from '@/lib/signwell/client';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus } from '../types';
import { Role } from '@/features/auth/types/roles';
import { AuditService } from './audit.service';
import { assertUuid } from '@/lib/validation/uuid';
import { redactSensitiveValue } from '@/lib/security/sanitize';

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

    // 1. Validate state
    const agreement = await this.agreementRepo.getById(agreementId);
    if (!agreement || agreement.agency_id !== agencyId) throw new Error("Agreement not found");
    
    AgreementStateMachine.validateTransition(agreement.status, AgreementStatus.SENT);

    // 2. Fetch Generated PDF from documents
    const { data: docs } = await this.supabase
      .from('documents')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!docs || docs.length === 0) throw new Error("Generated document not found");
    const document = docs[0];

    // Get a signed URL so SignWell can download it
    const { data: urlData } = await this.supabase.storage
      .from('secure_documents')
      .createSignedUrl(document.file_url, 3600);
      
    if (!urlData?.signedUrl) throw new Error("Could not generate signed URL for document");

    // 3. Create Payload for SignWell
    // Fetch Client (Main Applicant)
    const { data: client } = await this.supabase.from('clients').select('name, email').eq('id', agreement.client_id).single();
    if (!client) throw new Error("Client not found for agreement");

    // Fetch RMA (Agent)
    const { data: rmaUser } = await this.supabase.from('users').select('full_name, email').eq('id', agreement.created_by).single();
    if (!rmaUser) throw new Error("RMA (Creator) not found");

    // Fetch Optional Signers
    const { data: participants } = await this.supabase.from('agreement_participants').select('role, users(full_name, email)').eq('agreement_id', agreementId);
    
    // Also check `signers` table if external guests are stored there
    const { data: externalSigners } = await this.supabase.from('signers').select('role, full_name, email').eq('agreement_id', agreementId);

    const signwellSigners: any[] = [];
    
    // 1. Main Applicant (Routing Order 1)
    signwellSigners.push({
      id: 'main_applicant',
      name: client.name,
      email: client.email,
      routing_order: 1,
      role: 'Client'
    });

    // 2. Optional Signers (Routing Order 1)
    if (externalSigners) {
      externalSigners.forEach((s: any, idx: number) => {
        if (s.role === 'secondary_applicant' || s.role === 'sponsor') {
          signwellSigners.push({
            id: `optional_${idx}`,
            name: s.full_name,
            email: s.email,
            routing_order: 1,
            role: s.role === 'secondary_applicant' ? 'Secondary Applicant' : 'Sponsor'
          });
        }
      });
    }

    if (participants) {
      participants.forEach((p: any, idx: number) => {
        if (p.role === 'secondary_applicant' || p.role === 'sponsor') {
          if (p.users) {
            signwellSigners.push({
              id: `optional_p_${idx}`,
              name: p.users.full_name,
              email: p.users.email,
              routing_order: 1,
              role: p.role === 'secondary_applicant' ? 'Secondary Applicant' : 'Sponsor'
            });
          }
        }
      });
    }

    // 3. RMA (Routing Order 2)
    signwellSigners.push({
      id: 'migration_agent',
      name: rmaUser.full_name,
      email: rmaUser.email,
      routing_order: 2,
      role: 'Migration Agent'
    });

    // 4. Create Document via SignWell Service (REAL API)
    const payload = {
      test_mode: process.env.NODE_ENV !== 'production',
      name: agreement.title,
      files: [{ name: 'Agreement.pdf', file_url: urlData.signedUrl }],
      recipients: signwellSigners,
      expires_in: 30,
      with_signature_page: true,
      draft: true,
    };
    
    console.log("SIGNWELL_DISPATCH_START", redactSensitiveValue({
      name: payload.name,
      fileCount: payload.files.length,
      recipients: payload.recipients.map((recipient) => ({
        id: recipient.id,
        routing_order: recipient.routing_order,
        role: recipient.role,
      })),
      expires_in: payload.expires_in,
      draft: payload.draft,
      test_mode: payload.test_mode,
    }));

    const signwellData = await signwellClient.createDocument(payload as any);
    console.log("SIGNWELL_DRAFT_CREATED", redactSensitiveValue({ id: signwellData.id, status: signwellData.status }));

    // 5. Send Document (must be draft-only)
    const sentDoc = await signwellClient.sendDocument(signwellData.id);
    console.log("SIGNWELL_SEND_SUCCESS", redactSensitiveValue({ id: sentDoc.id, status: sentDoc.status }));

    // 6. Update Agreement and Log Audit
    await this.agreementRepo.update(agreementId, { 
      status: AgreementStatus.SENT,
      signwell_document_id: sentDoc.id,
      sent_at: new Date().toISOString()
    });

    await this.auditService.logEvent(
      agencyId,
      userId,
      agreementId,
      'Agreement Sent for Signature',
      { signwell_document_id: sentDoc.id },
    );

    return sentDoc;
  }
}
