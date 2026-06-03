import { z } from 'zod';
import { getRequiredEnv } from '@/lib/env';

const configSchema = z.object({
  apiKey: z.string().min(1, 'SIGNWELL_API_KEY is required'),
  webhookSecret: z.string().optional(),
  baseUrl: z.string().url().default('https://www.signwell.com/api/v1'),
});

export type SignwellConfig = z.infer<typeof configSchema>;

let cachedConfig: SignwellConfig | null = null;

export function getSignwellConfig(): SignwellConfig {
  if (cachedConfig) return cachedConfig;

  const apiKey = process.env.SIGNWELL_API_KEY?.trim();
  if (!apiKey) {
    getRequiredEnv('SIGNWELL_API_KEY');
  }

  cachedConfig = configSchema.parse({
    apiKey: apiKey!,
    webhookSecret: process.env.SIGNWELL_WEBHOOK_SECRET,
    baseUrl: process.env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1',
  });

  return cachedConfig;
}

/** Lazy accessor — resolves on first use, not at module import. */
export const signwellConfig: SignwellConfig = new Proxy({} as SignwellConfig, {
  get(_target, prop: string) {
    return getSignwellConfig()[prop as keyof SignwellConfig];
  },
});

export function validateSignwellConfig() {
  getSignwellConfig();
}
