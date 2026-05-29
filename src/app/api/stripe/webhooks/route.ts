// @ts-nocheck
import Stripe from 'stripe';
// @ts-nocheck
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanByPriceId } from '@/lib/stripe/plans';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
        return NextResponse.json({ error: 'Missing securely defined webhook config or headers' }, { status: 400 });
    }

    let stripeEvent: Stripe.Event;
    
    // 1. Verify Request Signature using official construct natively avoiding replay and spoof risks
    try {
        stripeEvent = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook Signature Error: ${err.message}`);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 401 });
    }

    const admin = createAdminClient();

    // 2. Protect Via Strict Idempotency 
    // Uses webhook_logs table preventing loops
    const { error: logErr } = await admin
        .from('webhook_logs')
        .insert([{
             provider: 'stripe',
             event_id: stripeEvent.id,
             event_type: stripeEvent.type,
             payload: stripeEvent as any,
             status: 'processing'
        }]);

    if (logErr && logErr.code === '23505') {
         return NextResponse.json({ status: 'Ignored: duplicate event locked implicitly' }, { status: 200 }); 
    } else if (logErr) {
         console.error('Webhook insert lock failed:', logErr);
         return NextResponse.json({ error: 'System Lock Error' }, { status: 500 });
    }

    // 3. Process Logic based on event mapping
    const evtType = stripeEvent.type;

    try {
        if (evtType === 'checkout.session.completed') {
             const session = stripeEvent.data.object as Stripe.Checkout.Session;
             
             // Extract Metadata manually assigned
             const agencyId = session.metadata?.agency_id;
             if (!agencyId) throw new Error('Untrackable Checkout Session');

        } else if (evtType === 'customer.subscription.created' || evtType === 'customer.subscription.updated') {
            const sub = stripeEvent.data.object as Stripe.Subscription;
            const agencyId = sub.metadata?.agency_id;
            const priceId = sub.items.data[0].price.id;
            const planConfig = getPlanByPriceId(priceId);

            if (!agencyId) throw new Error(`Untracked subscription metadata on sub ${sub.id}`);

            // Upsert the subscription mapping
            await admin.from('subscriptions').upsert({
                agency_id: agencyId,
                stripe_customer_id: sub.customer as string,
                stripe_subscription_id: sub.id,
                stripe_price_id: priceId,
                plan_name: planConfig?.id || 'UNKNOWN',
                status: sub.status as any,
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end,
                updated_at: new Date().toISOString()
            }, { onConflict: 'agency_id' }); // Only one subs per agency

            await admin.from('agencies').update({
                subscription_status: sub.status as any,
                plan_type: planConfig?.id || 'STARTER',
                max_users: planConfig?.limits.maxUsers || 2,
                max_documents: planConfig?.limits.maxDocuments || 50
            }).eq('id', agencyId);

        } else if (evtType === 'customer.subscription.deleted') {
            const sub = stripeEvent.data.object as Stripe.Subscription;
            const agencyId = sub.metadata?.agency_id;
            if (agencyId) {
                await admin.from('subscriptions')
                    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
                    .eq('stripe_subscription_id', sub.id);
                
                await admin.from('agencies')
                    .update({ subscription_status: 'canceled', plan_type: 'STARTER' })
                    .eq('id', agencyId);
            }
        } else if (evtType === 'invoice.payment_succeeded' || evtType === 'invoice.finalized' || evtType === 'invoice.payment_failed') {
            const invoice = stripeEvent.data.object as Stripe.Invoice;
            // Lookup the local agency ID
            const { data: ag } = await admin.from('agencies')
                    .select('id').eq('stripe_customer_id', invoice.customer as string).single();
            
            if (ag) {
                 await admin.from('invoices').upsert({
                     agency_id: ag.id,
                     stripe_invoice_id: invoice.id,
                     amount_paid: invoice.amount_paid,
                     amount_due: invoice.amount_due,
                     currency: invoice.currency,
                     hosted_invoice_url: invoice.hosted_invoice_url,
                     invoice_pdf: invoice.invoice_pdf,
                     status: invoice.status,
                     billing_reason: invoice.billing_reason,
                     paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
                     due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null
                 }, { onConflict: 'stripe_invoice_id' });
            }
        }

        // Finalize 
        await admin.from('webhook_logs')
             .update({ status: 'success', processed_at: new Date().toISOString() })
             .eq('event_id', stripeEvent.id);

        return NextResponse.json({ received: true });

    } catch (procErr: any) {
        console.error("Critical Webhook processing err:", procErr);
        await admin.from('webhook_logs').update({ status: 'failed_processing' }).eq('event_id', stripeEvent.id);
        return NextResponse.json({ error: 'Data processing error' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server err' }, { status: 500 });
  }
}

