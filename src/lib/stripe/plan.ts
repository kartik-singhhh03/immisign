import { APP_NAME } from '@/lib/brand';
import { getRequiredEnv, getOptionalEnv } from '@/lib/env';

export const IMMISIGN_PLAN_ID = 'IMMISIGN' as const;
export const INCLUDED_SEATS = 3;
export const BASE_PRICE_MONTHLY_USD = 49;
export const SEAT_PRICE_MONTHLY_USD = 10;

export type ImmisignPlanId = typeof IMMISIGN_PLAN_ID;

export interface ImmisignPlanConfig {
  id: ImmisignPlanId;
  name: string;
  description: string;
  baseMonthlyPriceId: string;
  seatMonthlyPriceId: string;
  includedSeats: number;
  basePriceMonthlyUsd: number;
  seatPriceMonthlyUsd: number;
  features: {
    oneAgencyWorkspace: boolean;
    oneBusinessProfile: boolean;
    unlimitedAgreements: boolean;
    applicationApprovals: boolean;
    documentSigning: boolean;
    templates: boolean;
    branding: boolean;
    auditTrail: boolean;
  };
}

let cachedPlan: ImmisignPlanConfig | null = null;

function resolvePriceId(envKey: string): string {
  const value = process.env[envKey]?.trim();
  if (value) return value;
  return getRequiredEnv(envKey);
}

export function getImmisignPlan(): ImmisignPlanConfig {
  if (cachedPlan) return cachedPlan;

  cachedPlan = {
    id: IMMISIGN_PLAN_ID,
    name: `${APP_NAME} Plan`,
    description:
      'One agency workspace with unlimited agreements, signing, templates, branding, and audit trail.',
    baseMonthlyPriceId: resolvePriceId('STRIPE_IMMISIGN_BASE_PRICE_ID'),
    seatMonthlyPriceId: resolvePriceId('STRIPE_IMMISIGN_SEAT_PRICE_ID'),
    includedSeats: INCLUDED_SEATS,
    basePriceMonthlyUsd: BASE_PRICE_MONTHLY_USD,
    seatPriceMonthlyUsd: SEAT_PRICE_MONTHLY_USD,
    features: {
      oneAgencyWorkspace: true,
      oneBusinessProfile: true,
      unlimitedAgreements: true,
      applicationApprovals: true,
      documentSigning: true,
      templates: true,
      branding: true,
      auditTrail: true,
    },
  };

  return cachedPlan;
}

/** Recognizes base or per-seat Stripe price IDs for webhook mapping. */
export function getPlanByPriceId(priceId: string): ImmisignPlanConfig | null {
  const plan = getImmisignPlan();
  if (priceId === plan.baseMonthlyPriceId || priceId === plan.seatMonthlyPriceId) {
    return plan;
  }
  return null;
}

/** Legacy env fallbacks during migration (optional). */
export function resolveLegacyPriceIds(): string[] {
  return [
    getOptionalEnv('STRIPE_STARTER_MONTHLY_PRICE_ID'),
    getOptionalEnv('STRIPE_PRO_MONTHLY_PRICE_ID'),
    getOptionalEnv('STRIPE_AGENCY_MONTHLY_PRICE_ID'),
  ].filter((id): id is string => Boolean(id));
}

export function isImmisignPriceId(priceId: string): boolean {
  return getPlanByPriceId(priceId) !== null || resolveLegacyPriceIds().includes(priceId);
}
