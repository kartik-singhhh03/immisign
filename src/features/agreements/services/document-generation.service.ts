import { SupabaseClient } from '@supabase/supabase-js';
import { AgreementRepository } from '../repositories/agreement.repository';
import { ClientRepository } from '../repositories/client.repository';
import { TemplateRepository } from '../repositories/template.repository';
import { TemplateService } from './template.service';
import { PDFService } from './pdf.service';
import { StorageHelpers } from '@/lib/supabase/storage';
import { AuditService } from './audit.service';
import { AgreementStateMachine } from './state-machine';
import { AgreementStatus } from '../types';
import { buildAgreementPreviewHtml } from '@/features/agreements/lib/agreement-preview-html';
import { createAdminClient } from '@/lib/supabase/admin';

export class DocumentGenerationService {
  private agreementRepo: AgreementRepository;
  private clientRepo: ClientRepository;
  private templateRepo: TemplateRepository;
  private auditService: AuditService;

  constructor(private readonly supabase: SupabaseClient) {
    this.agreementRepo = new AgreementRepository(supabase);
    this.clientRepo = new ClientRepository(supabase);
    this.templateRepo = new TemplateRepository(supabase);
    this.auditService = new AuditService(supabase);
  }

  async generateDocument(agencyId: string, userId: string, agreementId: string): Promise<{ storagePath: string, size: number, timeMs: number }> {
    const startTime = Date.now();
    
    // 1. Load Agreement
    const agreement = await this.agreementRepo.getById(agreementId);
    if (!agreement || agreement.agency_id !== agencyId) throw new Error("Agreement not found");

    // 2. Validate State
    AgreementStateMachine.validateTransition(agreement.status, AgreementStatus.GENERATED);

    // 3. Load Client
    if (!agreement.client_id) throw new Error("Agreement has no linked client");
    const client = await this.clientRepo.getById(agreement.client_id);
    if (!client) throw new Error("Client not found");

    // 4. Load Template (optional — built-in fallback HTML used if no template linked)
    let template: any = null;
    if (agreement.template_id) {
      template = await this.templateRepo.getById(agreement.template_id);
    }

    // 5. Fetch Additional Data
    const { data: agency } = await this.supabase.from('agencies').select('*').eq('id', agencyId).single();
    const responsibleRmaId = (agreement.metadata as any)?.responsible_rma_id || agreement.created_by;
    const { data: user } = await this.supabase.from('users').select('*').eq('id', responsibleRmaId).single();
    const { data: rma } = await this.supabase.from('rmas').select('*').eq('user_id', responsibleRmaId).maybeSingle();

    const wizardForm = (agreement.metadata as any)?.wizard_form;
    if (wizardForm) {
      const agencySnapshot = (agreement.metadata as any)?.agency_snapshot;
      const { data: principalUser } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('agency_id', agencyId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

      const selectedClausesMeta = (agreement.metadata as any)?.selected_clauses || [];
      const matterTypeConfigMeta = (agreement.metadata as any)?.matter_type_config || null;
      const compiledHtml = buildAgreementPreviewHtml({
        form: wizardForm,
        agency: {
          id: agencyId,
          name: agencySnapshot?.name || agency?.name || '',
          slug: agencySnapshot?.slug || agency?.slug || '',
          legalName: agencySnapshot?.legalName || agency?.legal_name || agency?.name,
          principalName: agencySnapshot?.principalName || principalUser?.full_name || user?.full_name,
          address: agencySnapshot?.address || agency?.address || undefined,
          abn: agencySnapshot?.abn || agency?.abn || undefined,
          phone: agencySnapshot?.phone || agency?.phone || undefined,
          email: agencySnapshot?.email || agency?.email || undefined,
          marn: agencySnapshot?.marn || rma?.mara_number || undefined,
          branding: agencySnapshot?.branding || undefined,
        },
        rma: user
          ? {
              id: responsibleRmaId,
              name: user.full_name,
              email: user.email,
              marn: rma?.mara_number,
            }
          : null,
        agreementRef: (agreement.metadata as any)?.agreement_ref || agreement.agreement_number,
        statusLabel: 'AWAITING SIGNATURE',
        matterTypeConfig: matterTypeConfigMeta,
        selectedClauses: selectedClausesMeta,
      });

      const pdfBuffer = await PDFService.generatePdf(compiledHtml);
      const fileName = `agreement-${agreement.agreement_number}.pdf`;
      const storagePath = StorageHelpers.getAgreementPath(agencyId, agreement.id, fileName);

      const { error: uploadError } = await this.supabase.storage
        .from('secure_documents')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError.message}`);

      await this.agreementRepo.update(agreement.id, {
        status: AgreementStatus.GENERATED,
      });

      const { error: docErr } = await this.supabase.from('documents').insert({
        agency_id: agencyId,
        agreement_id: agreement.id,
        uploaded_by: userId,
        file_name: fileName,
        original_name: fileName,
        file_url: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
      });
      if (docErr) throw new Error(`Failed to insert document: ${docErr.message}`);

      const timeMs = Date.now() - startTime;
      await this.auditService.logEvent(agencyId, userId, agreement.id, 'Agreement Generated', { storagePath, generationTimeMs: timeMs });
      await this.agreementRepo.update(agreement.id, { status: 'pending' as AgreementStatus });

      return { storagePath, size: pdfBuffer.length, timeMs };
    }

    const { data: matterType } = agreement.matter_type_id ? await this.supabase.from('matter_types').select('*').eq('id', agreement.matter_type_id).single() : { data: null };
    const { data: paymentSchedule } = await this.supabase.from('payment_schedules').select('*').eq('agreement_id', agreementId).single();
    const { data: signers } = await this.supabase.from('agreement_participants').select('role, users(full_name)').eq('agreement_id', agreementId);
    const admin = createAdminClient();
    const { data: defaultSignature } = await (admin as any)
      .from('user_signatures')
      .select('signature_type, storage_path, typed_name, draw_data')
      .eq('agency_id', agencyId)
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    const formatCurrency = (val: number | string | undefined) => val ? `$${Number(val).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'TBD';

    let firstVac = 'TBD';
    let block1Fee = 'TBD';
    let block2Fee = 'TBD';
    let surcharge = '1.4';
    let secondVac = 'TBD';

    if (paymentSchedule?.milestones && Array.isArray(paymentSchedule.milestones)) {
      const ms = paymentSchedule.milestones as any[];
      const firstVacItem = ms.find(m => m.name === 'First VAC');
      if (firstVacItem) firstVac = formatCurrency(firstVacItem.amount);
      const b1 = ms.find(m => m.name === 'Block 1');
      if (b1) block1Fee = formatCurrency(b1.amount);
      const b2 = ms.find(m => m.name === 'Block 2');
      if (b2) block2Fee = formatCurrency(b2.amount);
    }

    const secondaryApplicant = signers?.find(s => s.role === 'secondary_applicant')?.users ? (signers.find(s => s.role === 'secondary_applicant') as any).users.full_name : agreement.metadata?.secondary_applicant_name;
    const sponsor = signers?.find(s => s.role === 'sponsor')?.users ? (signers.find(s => s.role === 'sponsor') as any).users.full_name : agreement.metadata?.sponsor_name;

    let practitionerSignatureBlock = '';
    const includePractitionerSignature = Boolean((agreement.metadata as any)?.auto_insert_practitioner_signature);
    if (includePractitionerSignature && defaultSignature) {
      if (defaultSignature.signature_type === 'upload' && defaultSignature.storage_path) {
        const { data: signedSig } = await admin.storage.from('signatures').createSignedUrl(defaultSignature.storage_path, 3600);
        if (signedSig?.signedUrl) {
          practitionerSignatureBlock = `<img src="${signedSig.signedUrl}" alt="Practitioner signature" style="max-height:64px; max-width:220px; object-fit:contain; display:block; margin-bottom:8px;" />`;
        }
      } else if (defaultSignature.signature_type === 'draw' && defaultSignature.draw_data) {
        practitionerSignatureBlock = `<img src="${defaultSignature.draw_data}" alt="Drawn signature" style="max-height:64px; max-width:220px; object-fit:contain; display:block; margin-bottom:8px;" />`;
      } else if (defaultSignature.signature_type === 'type' && defaultSignature.typed_name) {
        practitionerSignatureBlock = `<div style="font-family:'Brush Script MT', cursive; font-size:34px; margin-bottom:8px;">${defaultSignature.typed_name}</div>`;
      }
    }

    // 6. Merge Variables
    const variables = {
      visa_category: matterType?.name || agreement.metadata?.visa_category || 'General Migration Matter',
      main_applicant_name: client.name,
      main_applicant_dob: (client as any).dob || agreement.metadata?.main_applicant_dob || '________________',
      secondary_applicant_name: secondaryApplicant,
      sponsor_name: sponsor,
      matter_description: agreement.description || 'Migration services as discussed.',
      first_vac: firstVac,
      fees_surcharge: surcharge,
      block_1_fee: block1Fee,
      block_2_fee: block2Fee,
      total_professional_fees: formatCurrency(paymentSchedule?.total_amount),
      total_initial_cost: 'TBD', // Would compute in full version
      second_vac: secondVac,
      payment_reference: client.id.split('-')[0].toUpperCase(),
      agency_name: agency?.name || 'Migration Agency',
      agency_legal_name: agency?.legal_name || agency?.name || 'Migration Agency',
      agency_abn: agency?.abn || 'XX XXX XXX XXX',
      agency_bank_name: agency?.bank_name || 'Bank Name',
      agency_bank_bsb: agency?.bank_bsb || 'XXX-XXX',
      agency_bank_account_number: agency?.bank_account_number || 'XXXXXXXX',
      agency_address: agency?.address || 'Sydney, Australia',
      agency_email: agency?.email || 'info@agency.com',
      agency_phone: agency?.phone || '0000 000 000',
      rma_name: user?.full_name || 'Registered Migration Agent',
      rma_marn: rma?.mara_number || 'XXXXXXX',
      practitioner_signature_block: practitionerSignatureBlock,
      ...agreement.metadata,
    };
    
    // Build Standard Agreement Layout matching DOCX structure
    const rawHtml = template.content?.html || `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; font-size: 14px;">
        
        <!-- Page 1 Header -->
        <div style="margin-bottom: 40px;">
          <h2 style="color: #1e3a8a; margin: 0;">{{agency_name}}</h2>
          <p style="font-size: 12px; color: #666; margin: 0;">{{agency_address}}</p>
          <div style="text-align: right; margin-top: -30px;">
            <p style="color: #b45309; font-weight: bold; font-size: 12px; margin: 0;">CLIENT SERVICE AGREEMENT</p>
          </div>
        </div>

        <h3 style="text-align: center; text-decoration: underline; margin-bottom: 30px;">CLIENT SERVICE AGREEMENT</h3>
        
        <p>Dear Applicant,</p>
        <p>Thank you for giving us an opportunity to understand your immigration need, and accordingly, to provide you with immigration-related services.</p>
        <p>We note that you want to apply for the following applicants:</p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f1f5f9; width: 30%;">Visa Category</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{visa_category}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f1f5f9;">Main Applicant Full Name</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{main_applicant_name}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f1f5f9;">DOB</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{main_applicant_dob}}</td>
          </tr>
          {{#if secondary_applicant_name}}
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f1f5f9;">Secondary Applicant</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{secondary_applicant_name}}</td>
          </tr>
          {{/if}}
          {{#if sponsor_name}}
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #f1f5f9;">Sponsor</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{sponsor_name}}</td>
          </tr>
          {{/if}}
        </table>

        <p>The purpose of this letter is to enter into a Client Service Agreement after confirming your understanding of the Terms and Conditions outlined in Schedule 1, and Estimate of Fees that are provided separately associated with the immigration-related services we provide.</p>
        <p>Make sure you have read and understood the conditions before entering into the agreement. If you wish to seek independent legal advice about this agreement, you should do so before signing this agreement.</p>
        <p>Thank you once again for this opportunity. We look forward to working with you to achieve the best possible outcome to meet your immigration-related needs.</p>

        <div style="margin-top: 40px; margin-bottom: 60px;">
          <p style="font-weight: bold; color: #1e3a8a;">Yours Sincerely</p>
          <p style="font-weight: bold; margin-bottom: 0;">{{rma_name}}</p>
          <p style="font-size: 12px; font-style: italic; margin-top: 2px;">Registered Migration Agent (MARN: {{rma_marn}})</p>
          <p style="font-size: 12px;">Mobile: {{agency_phone}} | E-mail: {{agency_email}}</p>
        </div>

        <div style="page-break-before: always;"></div>

        <!-- Schedule 1 -->
        <h3 style="text-align: center; color: #1e3a8a; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 30px;">Schedule 1 — Terms and Conditions</h3>

        <!-- Clause 1 & 2 -->
        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-bottom: 10px;">1. APPOINTMENT OF AGENT</div>
        <p style="font-size: 13px;">The Client appoints the Agent to represent the Client and to perform the services described in this agreement. The objective of our professional services is to present the visa application to the Immigration Department in the best possible manner in compliance with Australia’s immigration laws, policies and procedures.</p>

        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">2. CODE OF CONDUCT (THE CODE)</div>
        <p style="font-size: 13px;">This Agreement conforms to the Code of Conduct, a copy of which is available from the office of the Migration Agents Registration Authority at www.mara.gov.au.</p>

        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">3. SERVICES TO BE PROVIDED</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #1e293b; color: white; width: 50%;">Matter:</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{matter_description}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">First Visa Application Charge</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{first_vac}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">Fees incl. Surcharge of {{fees_surcharge}}%</td>
            <td style="border: 1px solid #ccc; padding: 8px;">Included</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">Block 1: Initial Consultation & File Preparation (Payable in Advance)</td>
            <td style="border: 1px solid #ccc; padding: 8px;">Amount: {{block_1_fee}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">Block 2: Lodgment of application (Payable Before Lodgment)</td>
            <td style="border: 1px solid #ccc; padding: 8px;">Amount: {{block_2_fee}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #cbd5e1; color: black;">Total Professional Fees:</td>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">{{total_professional_fees}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">Our Bank Details:</td>
            <td style="border: 1px solid #ccc; padding: 8px;">
              <strong>{{agency_legal_name}}</strong><br/>
              BSB: {{agency_bank_bsb}} Acc: {{agency_bank_account_number}}<br/>
              REFERENCE: {{payment_reference}}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #b45309; color: white;">TOTAL INITIAL COST (VAC + PROFESSIONAL FEES):</td>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">{{total_initial_cost}}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; background-color: #334155; color: white;">Second VAC</td>
            <td style="border: 1px solid #ccc; padding: 8px;">{{second_vac}}</td>
          </tr>
        </table>
        
        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">4. THE CLIENT AGREES THAT</div>
        <ul style="font-size: 13px; padding-left: 20px;">
          <li style="margin-bottom: 8px;">By signing this document he/she has reviewed the Consumer Guide which can be found at mara.gov.au.</li>
          <li style="margin-bottom: 8px;">The final decision on an application submitted to the Department is beyond the Agent's control. The Agent has not guaranteed the success of the visa application. <strong>The client agrees that NO VISA GUARANTEE has been provided by the agent.</strong></li>
          <li style="margin-bottom: 8px;">The Agent will not be liable for any loss arising from changes to the law affecting the Client's application, which occurs after the application has been lodged.</li>
        </ul>

        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">5. CONFIDENTIALITY</div>
        <p style="font-size: 13px;">The Agent will preserve the confidentiality of the Client. The Agent will not disclose or allow to be disclosed confidential information about the Client or the Client's business without the Client's written consent, unless required by law.</p>

        <div style="background-color: #dbeafe; padding: 5px 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">6. TERMINATION OF AGREEMENT</div>
        <p style="font-size: 13px;">The Client may terminate this agreement at any time. <strong>Block 1 fees are non-refundable as it covers initial consultation, setup of the matter documentation and other initial costs incurred.</strong></p>

        <div style="page-break-before: always;"></div>

        <!-- Signatures -->
        <h3 style="text-align: center; color: #1e3a8a; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 30px;">EXECUTION — SIGNATURES</h3>
        <p style="font-size: 13px; margin-bottom: 30px;">By signing this document, all parties confirm they have read, understood and agree to be bound by this Client Service Agreement.</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
          <tr>
            <td style="width: 50%; padding-right: 20px; vertical-align: top;">
              <div style="border: 2px solid #94a3b8; padding: 20px; border-radius: 8px; min-height: 250px;">
                <h4 style="margin-top: 0; color: #1e3a8a;">CLIENT</h4>
                <p style="font-size: 13px; margin-top: 15px;"><strong>Main Applicant:</strong> {{main_applicant_name}}</p>
                {{#if secondary_applicant_name}}
                <p style="font-size: 13px;"><strong>Secondary Applicant:</strong> {{secondary_applicant_name}}</p>
                {{/if}}
                {{#if sponsor_name}}
                <p style="font-size: 13px;"><strong>Sponsor:</strong> {{sponsor_name}}</p>
                {{/if}}
                <br/><br/><br/>
                <p style="font-size: 13px; border-top: 1px dashed #ccc; padding-top: 5px;">Signed by:</p>
                <p style="font-size: 13px;">Date: ...........................................</p>
              </div>
            </td>
            <td style="width: 50%; padding-left: 20px; vertical-align: top;">
              <div style="border: 2px solid #94a3b8; padding: 20px; border-radius: 8px; min-height: 250px;">
                <h4 style="margin-top: 0; color: #1e3a8a;">REGISTERED MIGRATION AGENT</h4>
                <p style="font-size: 13px; margin-top: 15px;"><strong>{{rma_name}}</strong></p>
                <p style="font-size: 13px; margin: 0;">MARN: {{rma_marn}}</p>
                <p style="font-size: 13px; margin: 0;">{{agency_name}}</p>
                <p style="font-size: 13px; margin: 0;">{{agency_legal_name}} - ABN: {{agency_abn}}</p>
                <br/><br/><br/>
                {{{practitioner_signature_block}}}
                <p style="font-size: 13px; border-top: 1px dashed #ccc; padding-top: 5px;">Signed by: {{rma_name}}</p>
                <p style="font-size: 13px;">Date: ...........................................</p>
              </div>
            </td>
          </tr>
        </table>
        
      </div>
    `;

    const compiledHtml = TemplateService.compile(rawHtml, variables);

    // 7. Generate PDF
    const pdfBuffer = await PDFService.generatePdf(compiledHtml);

    // 8. Store PDF
    const fileName = `agreement-${agreement.agreement_number}.pdf`;
    const storagePath = StorageHelpers.getAgreementPath(agencyId, agreement.id, fileName);

    const { error: uploadError } = await this.supabase.storage
      .from('secure_documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError.message}`);

    // 9. Update Agreement Status & Record Document
    await this.agreementRepo.update(agreement.id, { 
      status: AgreementStatus.GENERATED 
    });

    const { error: docErr } = await this.supabase.from('documents').insert({
      agency_id: agencyId,
      agreement_id: agreement.id,
      uploaded_by: userId,
      file_name: fileName,
      original_name: fileName,
      file_url: storagePath,
      file_size: pdfBuffer.length,
      mime_type: 'application/pdf',
    });
    if (docErr) throw new Error(`Failed to insert document: ${docErr.message}`);

    // 10. Audit
    const timeMs = Date.now() - startTime;
    await this.auditService.logEvent(agencyId, userId, agreement.id, 'Agreement Generated', { storagePath, generationTimeMs: timeMs });

    // 11. Update Agreement Status
    await this.agreementRepo.update(agreement.id, { status: 'pending' as AgreementStatus });

    return { storagePath, size: pdfBuffer.length, timeMs };
  }
}
