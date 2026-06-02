import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { SignWellService } from '@/features/agreements/services/signwell.service';
import { isUuid } from '@/lib/validation/uuid';
import { redactSensitiveValue, stripSensitiveUrlParams } from '@/lib/security/sanitize';

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

    const body = await req.json();
    const { formData } = body;

    // ALWAYS resolve agency_id from the authenticated session — never trust the client-sent value.
    // This prevents slug/fake-id values from reaching Postgres.
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
    let clientId = null;
    if (formData.clientEmail) {
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
    }

    // 3. Create Agreement
    const agreementId = crypto.randomUUID();
    const agreementMetadata = {
      visa_category: formData.visaSubclass,
      sponsor_name: formData.sponsorName,
      priority: formData.matterPriority,
      deadline: formData.lodgementDeadline,
    };
    const { error: agErr } = await (supabase as any).from('agreements').insert({
      id: agreementId,
      agency_id: agencyId,
      created_by: userId,
      client_id: clientId,
      template_id: templateId,
      agreement_number: `AGR-${Math.floor(Math.random() * 1000000)}`,
      title: `Service Agreement - ${formData.clientName}`,
      client_name: formData.clientName,
      client_email: formData.clientEmail,
      client_phone: formData.clientPhone || '',
      status: 'draft',
      description: formData.scopeOfWork,
      metadata: agreementMetadata
    });
    if (agErr) throw new Error(`Agreement insert failed: ${agErr.message}`);

    // 4. Create Payment Schedule
    const scheduleId = crypto.randomUUID();
    const { error: pErr } = await (supabase as any).from('payment_schedules').insert({
      id: scheduleId,
      agency_id: agencyId,
      agreement_id: agreementId,
      currency: 'AUD',
      total_amount: parseFloat(formData.professionalFee || "0"),
      milestones: [
        { name: 'Retainer Deposit', amount: parseFloat(formData.depositRequired || "0"), due_date: null, status: 'pending' },
        { name: 'Block 1', amount: parseFloat(formData.professionalFee || "0") / 2, due_date: null, status: 'pending' },
        { name: 'Block 2', amount: parseFloat(formData.professionalFee || "0") / 2, due_date: null, status: 'pending' }
      ]
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

    // 6. Push to SignWell. If the external provider rejects the request,
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
      const message = signwellError?.message || 'SignWell dispatch failed';
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
        stage: 'signwell_dispatch_failed',
        error: message,
        agreementId,
        result,
      }, { status: 502 });
    }

    // 7. Insert Activity Log
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
