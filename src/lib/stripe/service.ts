import { stripe } from './client';
import { SAAS_PLANS, getPlanByPriceId, PlanConfig } from './plans';
import { createAdminClient } from '../supabase/admin';
import { isSafeDevMode } from '../config';

export class StripeService {

    /**
     * Checks if tenant has customer id, creates if missing
     */
    async getOrCreateCustomer(agencyId: string, email: string, name: string): Promise<string> {
        if (isSafeDevMode) {
            return 'cus_mock_12345';
        }

        const admin = createAdminClient();
        const { data: agency, error } = await admin.from('agencies').select('stripe_customer_id').eq('id', agencyId).single();

        if (error) throw new Error('Agency retrieval failed in billing');

        if (agency.stripe_customer_id) {
            return agency.stripe_customer_id;
        }

        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                agency_id: agencyId,
            }
        });

        await admin.from('agencies').update({ stripe_customer_id: customer.id }).eq('id', agencyId);
        
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
            return { url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/workspace/avc-migration/billing?success=true` };
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
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
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
            return { url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/workspace/avc-migration/billing` };
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        });

        return { url: session.url };
    }
}

export const stripeService = new StripeService();
