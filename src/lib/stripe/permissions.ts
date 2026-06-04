import { getCurrentAgency } from '../supabase/auth';
import { getImmisignPlan } from './plan';
import { AppError, UnauthorizedError } from '../utils/errors';

/**
 * Ensures the agency has an active or trialing subscription before gated actions.
 */
export async function requireActiveSubscription() {
  const agency = await getCurrentAgency();
  if (!agency) {
    throw new UnauthorizedError('Authentication required');
  }

  const status = agency.subscription_status;

  if (!status || !['active', 'trialing'].includes(status)) {
    throw new AppError(
      'An active ImmiSign subscription is required. Subscribe from Billing settings.',
      'FORBIDDEN',
      403,
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
