/**
 * @deprecated Use `@/lib/stripe/plan` — single ImmiSign plan only.
 */
export {
  IMMISIGN_PLAN_ID,
  INCLUDED_SEATS,
  BASE_PRICE_MONTHLY_USD,
  SEAT_PRICE_MONTHLY_USD,
  getImmisignPlan,
  getPlanByPriceId,
  isImmisignPriceId,
  type ImmisignPlanConfig,
  type ImmisignPlanId,
} from './plan';

/** @deprecated Removed tiered plans (Starter/Pro/Agency). */
export type PlanName = 'IMMISIGN';
