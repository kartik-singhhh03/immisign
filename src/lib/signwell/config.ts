import { z } from 'zod';
import { getRequiredEnv, isProductionBuild } from '@/lib/env';

const configSchema = z.object({
  apiKey: z.string().min(1, 'SIGNWELL_API_KEY is required'),
  webhookSecret: z.string().optional(),
  baseUrl: z.string().url().default('https://www.signwell.com/api/v1'),
});

function resolveApiKey(): string {
  const value = process.env.SIGNWELL_API_KEY?.trim();
  if (value) return value;
  if (isProductionBuild()) {
    return getRequiredEnv('SIGNWELL_API_KEY');
  }
  throw new Error('SIGNWELL_API_KEY is not configured. Set it in .env.local for e-sign features.');
}

export const signwellConfig = configSchema.parse({
  apiKey: resolveApiKey(),
  webhookSecret: process.env.SIGNWELL_WEBHOOK_SECRET,
  baseUrl: process.env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1',
});

export function validateSignwellConfig() {
  if (isProductionBuild() && !process.env.SIGNWELL_API_KEY?.trim()) {
    throw new Error('SIGNWELL_API_KEY is required in production');
  }
}
