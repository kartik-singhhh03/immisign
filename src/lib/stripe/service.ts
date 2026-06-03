import { stripe } from './client';
import { SAAS_PLANS, getPlanByPriceId } from './plans';
import { createAdminClient } from '../supabase/admin';
import { getAppUrl } from '@/lib/app-url';

export class StripeService {

    async getOrCreateCustomer(agencyId: string, email: string, name: string): Promise<string> {
        const admin = createAdminClient();
        const { data: agency, error } = await admin.from('agencies').select('stripe_customer_id' as any).eq('id', agencyId).single() as any;

        if (error) throw new Error('Agency retrieval failed in billing');

        if (agency && (agency as any).stripe_customer_id) {
            return (agency as any).stripe_customer_id;
        }

        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                agency_id: agencyId,
            }
        });

        await (admin.from('agencies') as any).update({ stripe_customer_id: customer.id }).eq('id', agencyId);
        
        return customer.id;
    }

    async createCheckoutSession(
        agencyId: string, 
        userId: string, 
        customerEmail: string, 
        customerName: string, 
        priceId: string,
        agencySlug: string,
     ) {
        const customerId = await this.getOrCreateCustomer(agencyId, customerEmail, customerName);
        const plan = getPlanByPriceId(priceId);
        
        if (!plan) throw new Error('Invalid Stripe Price ID mapped to ImmiSign system.');

        const billingBase = `${getAppUrl()}/workspace/${agencySlug}/billing`;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [
                { price: priceId, quantity: 1 }
            ],
            success_url: `${billingBase}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: billingBase,
            metadata: {
                agency_id: agencyId,
                user_id: userId,
                plan_id: plan.id
            },
            subscription_data: {
                metadata: {
                   agency_id: agencyId, 
                }
            }
        });

        return { url: session.url };
    }

    async createBillingPortalSession(customerId: string, returnUrl: string) {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return { url: session.url };
    }
}

export const stripeService = new StripeService();
