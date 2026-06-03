import { getRequiredEnv, isProductionBuild } from '@/lib/env';

export type PlanName = 'STARTER' | 'PRO' | 'AGENCY';

export interface PlanConfig {
  id: PlanName;
  name: string;
  description: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  limits: {
    maxUsers: number;
    maxDocuments: number;
    maxStorageGb: number;
  };
  features: {
    hasApiAccess: boolean;
    hasWhiteLabel: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
}

function resolvePriceId(envKey: string): string {
  const value = process.env[envKey]?.trim();
  if (value) return value;
  if (isProductionBuild()) {
    return getRequiredEnv(envKey);
  }
  throw new Error(`${envKey} is not configured. Set it in .env.local for billing features.`);
}

export const SAAS_PLANS: Record<PlanName, PlanConfig> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for independent migration consultants just getting started.',
    monthlyPriceId: resolvePriceId('STRIPE_STARTER_MONTHLY_PRICE_ID'),
    yearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim() || resolvePriceId('STRIPE_STARTER_MONTHLY_PRICE_ID'),
    limits: {
      maxUsers: 2,
      maxDocuments: 50,
      maxStorageGb: 5,
    },
    features: {
      hasApiAccess: false,
      hasWhiteLabel: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'For growing migration agencies managing multiple workflows.',
    monthlyPriceId: resolvePriceId('STRIPE_PRO_MONTHLY_PRICE_ID'),
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID?.trim() || resolvePriceId('STRIPE_PRO_MONTHLY_PRICE_ID'),
    limits: {
      maxUsers: 10,
      maxDocuments: 500,
      maxStorageGb: 50,
    },
    features: {
      hasApiAccess: false,
      hasWhiteLabel: true,
      hasAnalytics: true,
      hasPrioritySupport: false,
    },
  },
  AGENCY: {
    id: 'AGENCY',
    name: 'Agency Enterprise',
    description: 'Unlimited boundaries and dedicated infrastructure scaling.',
    monthlyPriceId: resolvePriceId('STRIPE_AGENCY_MONTHLY_PRICE_ID'),
    yearlyPriceId: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID?.trim() || resolvePriceId('STRIPE_AGENCY_MONTHLY_PRICE_ID'),
    limits: {
      maxUsers: 9999,
      maxDocuments: 99999,
      maxStorageGb: 1000,
    },
    features: {
      hasApiAccess: true,
      hasWhiteLabel: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
    },
  },
};

export function getPlanByPriceId(priceId: string): PlanConfig | null {
  return Object.values(SAAS_PLANS).find(
    (plan) => plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId
  ) || null;
}
