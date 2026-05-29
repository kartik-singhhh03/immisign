import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/signwell/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { archiveCompletedSignWellPdf } from '@/lib/signwell/service';
import { WebhookEventPayload } from '@/lib/signwell/types';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signwell-signature');

    // 1. Verify Webhook Authenticity
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as WebhookEventPayload;
    const eventId = payload.event.hash; 
    const admin = createAdminClient();

    // 2. Enforce Strict Idempotency via Postgres Constraints
    // We insert into webhook_logs. If 'event_id' duplicates for 'signwell', it throws constraint error.
    const { error: logError } = await admin
      .from('webhook_logs')
      .insert([{
        provider: 'signwell',
        event_id: eventId,
        event_type: payload.event.event,
        payload: payload as any,
        status: 'processing'
      }]);

    // If it's a conflict constraint, it means we already processed this securely, ignore the loop
    if (logError && logError.code === '23505') {
       return NextResponse.json({ status: 'Ignored: already processed' }, { status: 200 });
    } else if (logError) {
       console.error("Webhook logging error: ", logError);
       return NextResponse.json({ error: 'Internal failure' }, { status: 500 });
    }

    // 3. Resolve the underlying agreement
    const signwellDocId = payload.document.id;
    const { data: agreement, error: localAgErr } = await admin
       .from('agreements')
       .select('id, agency_id')
       .eq('signwell_document_id', signwellDocId)
       .single();

    if (localAgErr || !agreement) {
        // Doc not found in our DB, mark log as missing_ref and bypass gracefully
        await admin.from('webhook_logs').update({ status: 'orphan_reference' }).eq('event_id', eventId);
        return NextResponse.json({ status: 'Ignored: Orphan reference' }, { status: 200 });
    }

    // 4. Synchronize state cleanly
    const eventType = payload.event.event;
    let newStatus = 'pending';
    let updatePayload: any = { signwell_status: payload.document.status };

    if (eventType === 'document_viewed') {
         newStatus = 'viewed';
    } else if (eventType === 'document_completed') {
         newStatus = 'completed';
         updatePayload.signwell_completed_at = payload.document.updated_at;
         
         // Enterprise Workflow: Sync the actual completed PDF automatically into the tenant vault
         try {
             await archiveCompletedSignWellPdf(agreement.id, signwellDocId, agreement.agency_id);
         } catch (e) {
             console.error("Critical: Failed to archive signed pdf during completion hook", e);
             // Webhook retry queue systems would kick in based upon failing HTTP status or manual job polling
         }

    } else if (eventType === 'document_declined') {
         newStatus = 'cancelled';
         updatePayload.signwell_declined_at = payload.document.updated_at;
    }

    updatePayload.status = newStatus;

    // 5. Update state transactional block
    await admin.from('agreements').update(updatePayload).eq('id', agreement.id);
    
    // Log Audit explicitly
    await admin.from('audit_logs').insert([{
       agency_id: agreement.agency_id,
       entity_type: 'agreement',
       entity_id: agreement.id,
       action: `webhook_${eventType}`,
       metadata: { event_id: eventId, new_status: newStatus }
    }]);

    // Finalize tracking
    await admin.from('webhook_logs').update({ status: 'success', processed_at: new Date().toISOString() }).eq('event_id', eventId);

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
