import { requireAgency } from '../supabase/auth';
import { getImmisignPlan } from './plan';
import { AppError } from '../utils/errors';
import { createClient } from '../supabase/server';

/**
 * Ensures the agency has an active or trialing subscription before gated actions.
 */
export async function requireActiveSubscription() {
  const { agency } = await requireAgency();
  const status = agency.subscription_status;

  if (!status || !['active', 'trialing'].includes(status)) {
    throw new AppError(
      'An active ImmiSign subscription is required. Subscribe from Billing settings.',
      'FORBIDDEN',
    );
  }

  return true;
}

/**
 * @deprecated Document limits removed on single plan (unlimited agreements).
 */
export async function requireDocumentCapacity() {
  return true;
}

/**
 * Premium features are included in the ImmiSign plan.
 */
export async function requireFeature(
  _featureKey: keyof ReturnType<typeof getImmisignPlan>['features'],
) {
  await requireActiveSubscription();
  const plan = getImmisignPlan();
  if (!plan.features[_featureKey]) {
    throw new AppError('This feature is not available on your plan.', 'FORBIDDEN');
  }
  return true;
}

/** @deprecated Seat capacity is managed via Stripe; use seat preview API before invites. */
export async function requireUserSeatCapacity() {
  return true;
}
