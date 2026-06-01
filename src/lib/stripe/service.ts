import { stripe } from './client';
import { SAAS_PLANS, getPlanByPriceId, PlanConfig } from './plans';
import { createAdminClient } from '../supabase/admin';
import { isSafeDevMode } from '../config';
import { getAppUrl } from '@/lib/app-url';

export class StripeService {

    /**
     * Checks if tenant has customer id, creates if missing
     */
    async getOrCreateCustomer(agencyId: string, email: string, name: string): Promise<string> {
        if (isSafeDevMode) {
            return 'cus_mock_12345';
        }

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

    /**
     * Instantiates Stripe Checkout 
     */
    async createCheckoutSession(
        agencyId: string, 
        userId: string, 
        customerEmail: string, 
        customerName: string, 
        priceId: string
     ) {
        if (isSafeDevMode) {
            return { url: `${getAppUrl()}/workspace/avc-migration/billing?success=true` };
        }
        
        const customerId = await this.getOrCreateCustomer(agencyId, customerEmail, customerName);
        const plan = getPlanByPriceId(priceId);
        
        if (!plan) throw new Error('Invalid Stripe Price ID mapped to ImmiSign system.');

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [
                { price: priceId, quantity: 1 }
            ],
            success_url: `${getAppUrl()}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${getAppUrl()}/dashboard/billing`,
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

    /**
     * Instantiates Stripe Customer Billing Portal
     */
    async createBillingPortalSession(customerId: string, returnUrl?: string) {
        if (isSafeDevMode) {
            return { url: returnUrl || `${getAppUrl()}/workspace/avc-migration/billing` };
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${getAppUrl()}/dashboard/billing`,
        });

        return { url: session.url };
    }
}

export const stripeService = new StripeService();
