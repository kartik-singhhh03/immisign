import { SupabaseClient } from '@supabase/supabase-js';
import { signwellClient } from '@/lib/signwell/client';
import { AgreementRepository } from '../repositories/agreement.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus } from '../types';
import { Role } from '@/features/auth/types/roles';

export class SignWellService {
  private agreementRepo: AgreementRepository;
  private auditRepo: AuditRepository;

  constructor(private supabase: SupabaseClient) {
    this.agreementRepo = new AgreementRepository(supabase);
    this.auditRepo = new AuditRepository(supabase);
  }

  async sendForSignature(agencyId: string, userId: string, role: Role, agreementId: string) {
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

    // 4. Create Document via SignWell Service (SIMULATED DUE TO RATE LIMIT)
    const payload = {
      test_mode: process.env.NODE_ENV !== 'production',
      name: agreement.title,
      files: [{ name: 'Agreement.pdf', file_url: urlData.signedUrl }],
      recipients: signwellSigners,
      expires_in: 30,
      with_signature_page: true,
      draft: true,
    };
    
    console.log("SIMULATING SIGNWELL DISPATCH. Payload:", JSON.stringify(payload, null, 2));

    const simulatedDocId = `sim_doc_${crypto.randomUUID()}`;
    const signwellData = {
      id: simulatedDocId,
      status: 'sent',
      recipients: signwellSigners,
      simulated: true
    };

    // 5. Send Document (SIMULATED)
    console.log(`SIMULATING SIGNWELL SEND for Document ID: ${simulatedDocId}`);

    // 6. Update Agreement and Log Audit
    await this.agreementRepo.update(agreementId, { 
      status: AgreementStatus.SENT,
      signwell_document_id: signwellData.id,
      sent_at: new Date().toISOString()
    });

    await this.auditRepo.create({
      agency_id: agencyId,
      user_id: userId,
      entity_type: 'agreement',
      entity_id: agreementId,
      action: 'Agreement Sent for Signature (Simulated)',
      metadata: { signwell_document_id: signwellData.id, simulated: true }
    });

    return signwellData;
  }
}
