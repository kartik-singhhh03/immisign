import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { SignWellService } from '@/features/agreements/services/signwell.service';
import { allocateAgreementReference } from '@/features/agreements/lib/agreement-reference';
import { buildSignersFromWizard } from '@/features/agreements/lib/wizard-signers';
import { isUuid } from '@/lib/validation/uuid';
import { redactSensitiveValue, stripSensitiveUrlParams } from '@/lib/security/sanitize';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';
import {
  findDuplicateRecipientEmails,
  friendlySignwellError,
  normalizeEmail,
} from '@/lib/signwell/recipient-validation';

export async function POST(req: NextRequest) {
  try {
    // Primary: cookie-based session (browser/UI flows)
    let supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    // Fallback: Bearer token from Authorization header (programmatic/test flows)
    if (!user) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const rawClient = createRawClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data: { user: tokenUser } } = await rawClient.auth.getUser();
        if (tokenUser) {
          supabase = rawClient as any;
          user = tokenUser;
        }
      }
    }

    console.log("Agreement API auth state:", { hasUser: !!user });

    // ALWAYS resolve agency_id from the authenticated session — never trust the client-sent value.
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'You must be logged in to create an agreement.'
      }, { status: 401 });
    }

    console.log('AGREEMENT_USER_RESOLUTION_START', JSON.stringify({ auth_user_id: user.id }));
    const { data: sessionUser, error: sessionUserError } = await (supabase as any)
      .from('users')
      .select('id, agency_id')
      .eq('id', user.id)
      .single();

    if (sessionUserError || !sessionUser?.agency_id) {
      console.error('AGREEMENT_USER_RESOLUTION_FAILED', JSON.stringify({
        auth_user_id: user.id,
        error: sessionUserError?.message || 'missing users row or agency_id',
      }));
      return NextResponse.json({
        success: false,
        error: 'Your account is not linked to an agency. Please contact support or complete onboarding.'
      }, { status: 400 });
    }

    const agencyId: string = sessionUser.agency_id;
    const userId: string = user.id;

    const body = await req.json();
    const { formData, agreementRef: clientAgreementRef, dispatchOptions, agencySnapshot, selectedClauses, selectedClauseIds, matterTypeConfig } = body;

    if (!formData?.clientName?.trim() || !formData?.clientEmail?.trim()) {
      return NextResponse.json({ success: false, error: 'Client name and email are required.' }, { status: 400 });
    }

    const responsibleRmaId = dispatchOptions?.responsibleRmaId || formData.responsibleRma || userId;

    let agreementRef = clientAgreementRef;
    try {
      agreementRef = await allocateAgreementReference(agencyId);
    } catch (refErr: any) {
      console.warn('AGREEMENT_REF_ALLOCATION_FALLBACK', refErr?.message);
      if (!agreementRef) {
        agreementRef = `AGR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      }
    }

    console.log('AGREEMENT_USER_RESOLUTION_SUCCESS', JSON.stringify({
      auth_user_id: user.id,
      database_user_id: sessionUser.id,
      agency_id: agencyId,
    }));

    // Defensive UUID validation — return 400 before touching Postgres.
    console.log({ agencyId, typeofAgencyId: typeof agencyId });

    if (!isUuid(agencyId)) {
      return NextResponse.json({
        success: false,
        error: `agency_id resolved to "${agencyId}" which is not a valid UUID. Your account may not be properly linked to an agency — please log out and log back in, or contact support.`
      }, { status: 400 });
    }

    if (!isUuid(userId)) {
      return NextResponse.json({
        success: false,
        error: `Authenticated user id resolved to "${userId}" which is not a valid UUID. Please log out and log back in.`
      }, { status: 400 });
    }

    // 1. Resolve Template ID for Standard Agreement
    const { data: template } = await (supabase as any).from('templates').select('id').eq('agency_id', agencyId).limit(1).single();
    let templateId = template?.id;

    if (!templateId) {
       // Attempt to create a default template — if RLS blocks it, continue with null
       const { data: newTpl, error: tplErr } = await (supabase as any).from('templates').insert({
         agency_id: agencyId,
         name: 'Standard OMARA Service Agreement',
         content: { html: "" }
       }).select('id').single();
       if (tplErr) {
         console.warn(`Template creation blocked (${tplErr.message}) — proceeding without template_id`);
         templateId = null;
       } else {
         templateId = newTpl?.id ?? null;
       }
    }

    // 2. Resolve or Create Client
    let clientId = formData.clientId || null;
    if (!clientId && formData.clientEmail) {
       const { data: existingClient } = await (supabase as any).from('clients').select('id').eq('agency_id', agencyId).eq('email', formData.clientEmail).limit(1).single();
       if (existingClient) {
           clientId = existingClient.id;
       } else {
           const { data: newClient, error: clientErr } = await (supabase as any).from('clients').insert({
               agency_id: agencyId,
               name: formData.clientName || 'Unnamed Client',
               email: formData.clientEmail,
               phone: formData.clientPhone || null
           }).select('id').single();
           if (clientErr) throw new Error(`Client insert failed: ${clientErr.message}`);
           clientId = newClient?.id;
       }
       if (clientId && formData.clientPhone) {
         await (supabase as any).from('clients').update({ phone: formData.clientPhone }).eq('id', clientId);
       }
    }

    const agreementMetadata = {
      wizard_form: formData,
      agreement_ref: agreementRef,
      responsible_rma_id: responsibleRmaId,
      agency_snapshot: agencySnapshot || null,
      selected_clauses: selectedClauses || [],
      selected_clause_ids: selectedClauseIds || [],
      matter_type_config: matterTypeConfig || null,
      matter_type: formData.matterType,
      visa_subclass: formData.visaSubclass,
      sponsor_name: formData.sponsorName,
      file_lodgement_ref: formData.fileLodgementRef,
      agreement_date: formData.agreementDate,
      client_address: formData.clientAddress,
      scope_of_services: formData.scopeOfServices,
      special_terms: formData.specialTerms,
      estimated_disbursements: formData.estimatedDisbursements,
      payment_schedule_label: formData.paymentSchedule,
      dispatch_options: dispatchOptions || {},
    };

    const agreementNumber = agreementRef;

    // 3. Create Agreement (only on final send)
    const agreementId = crypto.randomUUID();
    const { error: agErr } = await (supabase as any).from('agreements').insert({
      id: agreementId,
      agency_id: agencyId,
      created_by: responsibleRmaId,
      client_id: clientId,
      template_id: templateId,
      agreement_number: agreementNumber,
      title: `Service Agreement - ${formData.clientName}`,
      client_name: formData.clientName,
      client_email: formData.clientEmail,
      client_phone: formData.clientPhone || '',
      status: 'draft',
      description: formData.scopeOfServices,
      metadata: agreementMetadata
    });
    if (agErr) throw new Error(`Agreement insert failed: ${agErr.message}`);

    // Signers from wizard (Primary Applicant, Secondary, Sponsor, Dependants)
    const wizardSigners = buildSignersFromWizard(formData);
    for (const signer of wizardSigners) {
      if (signer.role === 'primary_applicant') continue;
      await (supabase as any).from('signers').insert({
        id: crypto.randomUUID(),
        agency_id: agencyId,
        agreement_id: agreementId,
        full_name: signer.name,
        email: signer.email,
        role: signer.role,
        signing_order: 1,
      });
    }

    // 4. Create Payment Schedule
    const scheduleId = crypto.randomUUID();
    const professionalFee = parseFloat(formData.professionalFee || '0');
    const disbursements = parseFloat(formData.estimatedDisbursements || '0');
    let milestones: Array<{ name: string; amount: number; due_date: null; status: string }> = [];

    if (formData.paymentSchedule?.includes('100% upfront')) {
      milestones = [{ name: 'Full payment on engagement', amount: professionalFee, due_date: null, status: 'pending' }];
    } else if (formData.paymentSchedule?.includes('33%')) {
      milestones = [
        { name: 'Engagement (33%)', amount: Math.round(professionalFee * 0.33 * 100) / 100, due_date: null, status: 'pending' },
        { name: 'Lodgement (33%)', amount: Math.round(professionalFee * 0.33 * 100) / 100, due_date: null, status: 'pending' },
        { name: 'Decision (34%)', amount: Math.round(professionalFee * 0.34 * 100) / 100, due_date: null, status: 'pending' },
      ];
    } else if (formData.paymentSchedule?.includes('Hourly')) {
      milestones = [{ name: 'Hourly invoicing', amount: professionalFee, due_date: null, status: 'pending' }];
    } else if (formData.paymentSchedule?.includes('Fixed fee')) {
      milestones = [{ name: 'Fixed fee per agreement', amount: professionalFee, due_date: null, status: 'pending' }];
    } else {
      milestones = [
        { name: 'Engagement (50%)', amount: professionalFee / 2, due_date: null, status: 'pending' },
        { name: 'Prior to lodgement (50%)', amount: professionalFee / 2, due_date: null, status: 'pending' },
      ];
    }

    const { error: pErr } = await (supabase as any).from('payment_schedules').insert({
      id: scheduleId,
      agency_id: agencyId,
      agreement_id: agreementId,
      currency: 'AUD',
      total_amount: professionalFee,
      milestones,
    });
    if (pErr) throw new Error(`Payment schedule insert failed: ${pErr.message}`);

    // 5. Generate PDF Document — agreement record already exists; do not roll it back on PDF failure
    console.log("Step 5: Generating PDF");
    const docService = new DocumentGenerationService(supabase);
    let result: { storagePath: string; size: number; timeMs: number } | null = null;
    try {
      result = await docService.generateDocument(agencyId, userId, agreementId);
      console.log("PDF Generation Result:", {
        size: result.size,
        timeMs: result.timeMs,
        storagePath: stripSensitiveUrlParams(result.storagePath),
      });
    } catch (pdfError: any) {
      const pdfMessage = pdfError?.message || 'PDF generation failed';
      console.error("PDF_GENERATION_FAILED", pdfError?.stack || pdfMessage);

      await (supabase as any).from('agreements').update({
        status: 'draft',
        metadata: {
          ...agreementMetadata,
          pdf_generation_error: pdfMessage,
          pdf_generation_failed_at: new Date().toISOString(),
        },
      }).eq('id', agreementId).eq('agency_id', agencyId);

      await (supabase as any).from('activity_logs').insert({
        id: crypto.randomUUID(),
        agency_id: agencyId,
        user_id: userId,
        type: 'agreement',
        title: 'Agreement PDF Generation Failed',
        description: `Service Agreement for ${formData.clientName} was created but PDF generation failed: ${pdfMessage}`,
        reference_id: agreementId,
        reference_type: 'agreement',
      });

      return NextResponse.json({
        success: false,
        stage: 'pdf_generation_failed',
        error: pdfMessage,
        agreementId,
        stack: process.env.NODE_ENV === 'development' ? pdfError?.stack : undefined,
      }, { status: 502 });
    }

    // 6. Validate signer emails before SignWell (avoid 422 duplicate recipient / CC).
    const wizardSignersForValidation = buildSignersFromWizard(formData);
    const signerEmails = wizardSignersForValidation.map((s) => s.email);
    const dup = findDuplicateRecipientEmails(signerEmails);
    if (dup) {
      return NextResponse.json({
        success: false,
        stage: 'signwell_validation',
        error: `Duplicate signer email: ${dup}. Each signer must have a unique email address.`,
      }, { status: 422 });
    }
    const senderEmailNorm = normalizeEmail(
      (await supabase.from('users').select('email').eq('id', userId).single()).data?.email || user.email || '',
    );
    const ccMe = Boolean(dispatchOptions?.ccMe ?? formData.ccMe);
    if (ccMe && senderEmailNorm && signerEmails.some((e) => normalizeEmail(e) === senderEmailNorm)) {
      return NextResponse.json({
        success: false,
        stage: 'signwell_validation',
        error: friendlySignwellError('email already a recipient'),
      }, { status: 422 });
    }

    // 7. Push to SignWell. If the external provider rejects the request,
    // keep the generated PDF and DB rows, but do not pretend dispatch worked.
    console.log("Step 6: Pushing to SignWell");
    const swService = new SignWellService(supabase);
    let swResult: any = null;
    try {
      swResult = await swService.sendForSignature(agencyId, userId, 'owner' as any, agreementId);
      console.log("SignWell Result:", redactSensitiveValue({
        id: swResult?.id,
        status: swResult?.status,
        recipientCount: Array.isArray(swResult?.recipients) ? swResult.recipients.length : 0,
        simulated: swResult?.simulated,
      }));
    } catch (signwellError: any) {
      const rawMessage = signwellError?.message || 'SignWell dispatch failed';
      const message = friendlySignwellError(rawMessage);
      const isValidation =
        rawMessage.includes('422') ||
        rawMessage.includes('already a recipient') ||
        rawMessage.includes('copied_contact');
      await (supabase as any).from('agreements').update({
        status: 'draft',
        signwell_status: 'failed',
        metadata: {
          ...agreementMetadata,
          last_dispatch_error: message,
          last_dispatch_failed_at: new Date().toISOString(),
        },
      }).eq('id', agreementId).eq('agency_id', agencyId);

      await (supabase as any).from('activity_logs').insert({
        id: crypto.randomUUID(),
        agency_id: agencyId,
        user_id: userId,
        type: 'agreement',
        title: 'Agreement Dispatch Failed',
        description: `Service Agreement for ${formData.clientName} was generated but SignWell rejected dispatch: ${message}`,
        reference_id: agreementId,
        reference_type: 'agreement',
      });

      return NextResponse.json({
        success: false,
        stage: isValidation ? 'signwell_validation' : 'signwell_dispatch_failed',
        error: message,
        agreementId,
        result,
      }, { status: isValidation ? 422 : 502 });
    }

    // 8. Insert Activity Log
    await (supabase as any).from('activity_logs').insert({
      id: crypto.randomUUID(),
      agency_id: agencyId,
      user_id: userId,
      type: 'agreement',
      title: 'Agreement Dispatched',
      description: `Service Agreement for ${formData.clientName} sent for signature via SignWell.`,
      reference_id: agreementId,
      reference_type: 'agreement',
    });

    const { data: agencyMeta } = await supabase.from('agencies').select('slug').eq('id', agencyId).single();
    const notify = new NotificationService(supabase as any);
    await notify.notify({
      agencyId,
      userId: userId,
      type: 'agreement',
      title: 'Agreement sent for signature',
      message: `Service agreement for ${formData.clientName} was sent via SignWell.`,
      actionUrl: buildWorkspaceActionUrl(agencyMeta?.slug || 'workspace', `/agreements/${agreementId}`),
      entityType: 'agreement',
      entityId: agreementId,
      actorId: userId,
    });

    return NextResponse.json({
      success: true,
      agreementId,
      result,
      signwellResult: swResult
    });

  } catch (err: any) {
    console.error("Standard Agreement Generation Error Stack:", err.stack);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
