import type { SupabaseClient } from '@supabase/supabase-js';
import { allocateAgreementReference } from '@/features/agreements/lib/agreement-reference';
import { allocateClientNumber } from '@/lib/clients/client-number';
import { buildMatterClientPath } from '@/features/clients/lib/matter-scope';
import { DocumentAuditService } from '@/lib/audit/document-audit.service';
import { resolveServiceAgreementTemplateId } from '@/lib/templates/service-agreement-template';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import type { OnboardingCompletePayload, OnboardingCompleteResult } from '../types';

function fullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim();
}

function calcSurcharge(visaFees: number, percent: number | null | undefined): number {
  if (percent == null || Number.isNaN(percent) || percent <= 0) return 0;
  return Math.round(visaFees * (percent / 100) * 100) / 100;
}

export class OnboardingService {
  constructor(private supabase: SupabaseClient) {}

  async complete(
    agencyId: string,
    actorUserId: string,
    workspaceSlug: string,
    payload: OnboardingCompletePayload,
  ): Promise<OnboardingCompleteResult> {
    let clientId: string | null = null;
    let matterId: string | null = null;
    let agreementId: string | null = null;
    let approvalId: string | null = null;

    const rollback = async () => {
      if (approvalId) {
        await this.supabase.from('application_approvals').delete().eq('id', approvalId);
      }
      if (agreementId) {
        await this.supabase.from('agreement_fee_items').delete().eq('agreement_id', agreementId);
        await this.supabase.from('agreements').delete().eq('id', agreementId);
      }
      if (matterId) {
        await this.supabase.from('matters').delete().eq('id', matterId);
      }
      if (clientId) {
        await this.supabase.from('clients').delete().eq('id', clientId);
      }
    };

    try {
      const { data: surchargeRow } = await this.supabase
        .from('matter_defaults')
        .select('card_processing_surcharge_percent')
        .eq('agency_id', agencyId)
        .maybeSingle();

      const surchargePercent = surchargeRow?.card_processing_surcharge_percent ?? null;
      const visaFeeSurcharge = calcSurcharge(payload.financial.visaFees, surchargePercent);

      const clientNumber = await allocateClientNumber(agencyId, this.supabase);
      clientId = crypto.randomUUID();
      const clientName = fullName(payload.primary.firstName, payload.primary.lastName);

      const { error: clientErr } = await this.supabase.from('clients').insert({
        id: clientId,
        agency_id: agencyId,
        name: clientName,
        first_name: payload.primary.firstName.trim(),
        last_name: payload.primary.lastName.trim(),
        email: payload.primary.email.trim(),
        phone: payload.primary.mobile.trim(),
        address: payload.primary.address.trim(),
        dob: payload.primary.dateOfBirth,
        client_number: clientNumber,
      });
      if (clientErr) throw new Error(`Client insert failed: ${clientErr.message}`);

      matterId = crypto.randomUUID();
      const { error: matterErr } = await this.supabase.from('matters').insert({
        id: matterId,
        agency_id: agencyId,
        client_id: clientId,
        matter_type_id: payload.matter.matterTypeId,
        visa_subclass: payload.matter.visaSubclass.trim(),
        visa_stream: payload.matter.visaStream.trim() || null,
        assigned_rma_id: payload.matter.assignedAgentId,
        priority: payload.matter.priority,
        status: 'onboarding',
      });
      if (matterErr) throw new Error(`Matter insert failed: ${matterErr.message}`);

      const primaryApplicantId = crypto.randomUUID();
      const { error: primaryErr } = await this.supabase.from('matter_applicants').insert({
        id: primaryApplicantId,
        agency_id: agencyId,
        matter_id: matterId,
        role: 'primary',
        first_name: payload.primary.firstName.trim(),
        last_name: payload.primary.lastName.trim(),
        email: payload.primary.email.trim(),
        phone: payload.primary.mobile.trim(),
        date_of_birth: payload.primary.dateOfBirth,
      });
      if (primaryErr) throw new Error(`Primary applicant insert failed: ${primaryErr.message}`);

      if (payload.hasSecondary && payload.secondary) {
        const { error: secErr } = await this.supabase.from('matter_applicants').insert({
          id: crypto.randomUUID(),
          agency_id: agencyId,
          matter_id: matterId,
          role: 'secondary',
          first_name: payload.secondary.firstName.trim(),
          last_name: payload.secondary.lastName.trim(),
          email: payload.secondary.email.trim(),
          phone: payload.secondary.mobile.trim(),
          date_of_birth: payload.secondary.dateOfBirth,
        });
        if (secErr) throw new Error(`Secondary applicant insert failed: ${secErr.message}`);
      }

      const { error: finErr } = await this.supabase.from('matter_financials').insert({
        matter_id: matterId,
        agency_id: agencyId,
        professional_fee: payload.financial.professionalFee,
        deposit: payload.financial.deposit,
        visa_fees: payload.financial.visaFees,
        visa_fee_surcharge: visaFeeSurcharge,
        surcharge_percent_applied: surchargePercent,
      });
      if (finErr) throw new Error(`Financial insert failed: ${finErr.message}`);

      const fileNumber = await allocateAgreementReference(agencyId);
      const templateId = await resolveServiceAgreementTemplateId(this.supabase, agencyId);
      agreementId = crypto.randomUUID();

      const wizardForm = {
        clientName,
        clientEmail: payload.primary.email,
        clientPhone: payload.primary.mobile,
        clientAddress: payload.primary.address,
        matterTypeId: payload.matter.matterTypeId,
        visaSubclass: payload.matter.visaSubclass,
        visaStream: payload.matter.visaStream,
        responsibleRma: payload.matter.assignedAgentId,
        primaryApplicantName: clientName,
        primaryApplicantDob: payload.primary.dateOfBirth,
        secondaryApplicantName: payload.hasSecondary && payload.secondary
          ? fullName(payload.secondary.firstName, payload.secondary.lastName)
          : '',
        secondaryApplicantDob: payload.secondary?.dateOfBirth || '',
        secondaryApplicantEmail: payload.secondary?.email || '',
        feeItems: [
          {
            description: 'Professional Fees',
            amount: String(payload.financial.professionalFee),
            category: 'professional',
            dueTrigger: 'On engagement',
            sortOrder: 0,
          },
          {
            description: 'Deposit',
            amount: String(payload.financial.deposit),
            category: 'professional',
            dueTrigger: 'On engagement',
            sortOrder: 1,
          },
          {
            description: 'Visa Fees',
            amount: String(payload.financial.visaFees),
            category: 'government',
            dueTrigger: 'Prior to lodgement',
            sortOrder: 2,
          },
          ...(visaFeeSurcharge > 0
            ? [{
                description: 'Visa Fee Surcharge',
                amount: String(visaFeeSurcharge),
                category: 'government',
                dueTrigger: 'Prior to lodgement',
                sortOrder: 3,
              }]
            : []),
        ],
      };

      const { error: agErr } = await this.supabase.from('agreements').insert({
        id: agreementId,
        agency_id: agencyId,
        created_by: payload.matter.assignedAgentId,
        client_id: clientId,
        template_id: templateId,
        matter_type_id: payload.matter.matterTypeId,
        matter_id: matterId,
        agreement_number: fileNumber,
        title: `Service Agreement - ${clientName}`,
        client_name: clientName,
        client_email: payload.primary.email,
        client_phone: payload.primary.mobile,
        visa_stream: payload.matter.visaStream.trim() || null,
        status: 'draft',
        metadata: {
          wizard_form: wizardForm,
          onboarding: true,
          matter_id: matterId,
          visa_subclass: payload.matter.visaSubclass,
          visa_stream: payload.matter.visaStream,
          client_address: payload.primary.address,
          responsible_rma_id: payload.matter.assignedAgentId,
          priority: payload.matter.priority,
        },
      });
      if (agErr) throw new Error(`Agreement insert failed: ${agErr.message}`);

      const feeRows = wizardForm.feeItems.map((item, index) => ({
        id: crypto.randomUUID(),
        agreement_id: agreementId,
        agency_id: agencyId,
        description: item.description,
        amount: parseFloat(item.amount) || 0,
        category: item.category,
        due_trigger: item.dueTrigger,
        sort_order: index,
      }));
      if (feeRows.length) {
        const { error: feeErr } = await this.supabase.from('agreement_fee_items').insert(feeRows);
        if (feeErr) throw new Error(`Fee items failed: ${feeErr.message}`);
      }

      approvalId = crypto.randomUUID();
      const { data: matterType } = await this.supabase
        .from('matter_types')
        .select('name')
        .eq('id', payload.matter.matterTypeId)
        .maybeSingle();

      const { error: apErr } = await this.supabase.from('application_approvals').insert({
        id: approvalId,
        agency_id: agencyId,
        client_id: clientId,
        created_by: actorUserId,
        assigned_rma_id: payload.matter.assignedAgentId,
        matter_type_id: payload.matter.matterTypeId,
        matter_id: matterId,
        approval_number: fileNumber,
        title: `${matterType?.name || 'Matter'} - ${clientName}`,
        visa_subclass: payload.matter.visaSubclass.trim(),
        visa_stream: payload.matter.visaStream.trim() || null,
        priority: payload.matter.priority,
        status: 'draft',
      });
      if (apErr) throw new Error(`Approval insert failed: ${apErr.message}`);

      await this.supabase
        .from('matters')
        .update({ agreement_id: agreementId, approval_id: approvalId, status: 'active' })
        .eq('id', matterId);

      await this.supabase.from('activity_logs').insert({
        id: crypto.randomUUID(),
        agency_id: agencyId,
        user_id: actorUserId,
        type: 'client',
        title: 'Client onboarded',
        description: `${clientName} · ${fileNumber} created via unified onboarding`,
        reference_id: clientId,
        reference_type: 'client',
      });

      let pdfGenerated = false;
      try {
        const docService = new DocumentGenerationService(this.supabase);
        await docService.generateDocument(agencyId, payload.matter.assignedAgentId, agreementId!);
        pdfGenerated = true;
        const audit = new DocumentAuditService(this.supabase);
        await audit.record({
          agencyId,
          clientId,
          matterId,
          documentType: 'service_agreement',
          documentId: agreementId,
          eventType: 'generated',
          actorName: clientName,
          actorEmail: payload.primary.email,
          provider: 'immimate',
          metadata: { source: 'onboarding', file_number: fileNumber, auto_generate: true },
        });
      } catch (pdfErr) {
        console.error('[onboarding] PDF generation failed — agreement remains draft:', pdfErr);
      }

      const deepLink = buildMatterClientPath(
        workspaceSlug,
        clientId,
        'application_approval',
        approvalId,
        'overview',
      );

      return {
        clientId: clientId!,
        clientNumber,
        matterId: matterId!,
        agreementId: agreementId!,
        approvalId: approvalId!,
        deepLink,
        agreementPdfGenerated: pdfGenerated,
      };
    } catch (e) {
      await rollback();
      throw e;
    }
  }
}
