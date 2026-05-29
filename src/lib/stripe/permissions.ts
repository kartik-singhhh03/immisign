import { requireAgency } from '../supabase/auth';
import { SAAS_PLANS, PlanName } from './plans';
import { AppError } from '../utils/errors';
import { createClient } from '../supabase/server';

/**
 * Validates if the current agency has physical capacity mapping remaining to add a user. 
 */
export async function requireUserSeatCapacity() {
    const { agency } = await requireAgency();
    const supabase = await createClient();

    const { count } = await supabase
       .from('users')
       .select('*', { count: 'exact', head: true })
       .eq('agency_id', agency.id)
       .eq('is_active', true);

    const currentActiveUsers = count || 0;

    if (currentActiveUsers >= agency.max_users) {
        throw new AppError(
             `Your current plan limits you to ${agency.max_users} users. Please upgrade to add more team members.`,
             'FORBIDDEN'
        );
    }

    return true;
}

/**
 * Validates if the current tenant has document limits left.
 */
export async function requireDocumentCapacity() {
    const { agency } = await requireAgency();
    const supabase = await createClient();

    const { count } = await supabase
       .from('agreements')
       .select('*', { count: 'exact', head: true })
       .eq('agency_id', agency.id);

    const usedDocs = count || 0;

    if (usedDocs >= agency.max_documents) {
        throw new AppError(
             `Your current plan limits you to ${agency.max_documents} documents. Please upgrade to send more.`,
             'FORBIDDEN'
        );
    }
    
    return true;
}

/**
 * Validates premium feature flags natively.
 */
export async function requireFeature(featureKey: keyof typeof SAAS_PLANS['AGENCY']['features']) {
    const { agency } = await requireAgency();
    
    // Safely mapping the db string backup over configuration sets
    const planConfig = SAAS_PLANS[agency.plan_type as PlanName] || SAAS_PLANS['STARTER'];

    if (!planConfig.features[featureKey]) {
        throw new AppError(
            `This feature requires a premium plan. Please upgrade your subscription.`,
            'FORBIDDEN'
        );
    }
    return true;
}
