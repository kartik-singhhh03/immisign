import { z } from 'zod';

const configSchema = z.object({
  apiKey: z.string().min(1, 'SIGNWELL_API_KEY is required for production'),
  webhookSecret: z.string().optional(), // Used to verify incoming payloads
  baseUrl: z.string().url().default('https://www.signwell.com/api/v1'),
});

// Avoid failing builds at compile time entirely if env is partial
export const signwellConfig = configSchema.parse({
  apiKey: process.env.SIGNWELL_API_KEY || 'dummy_for_build', 
  webhookSecret: process.env.SIGNWELL_WEBHOOK_SECRET,
  baseUrl: process.env.SIGNWELL_BASE_URL || 'https://www.signwell.com/api/v1',
});

// Helper for strict runtime checks
export function validateSignwellConfig() {
  if (signwellConfig.apiKey === 'dummy_for_build') {
     const message = 'SIGNWELL_API_KEY is not set.';
     if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
       throw new Error(message);
     }
     console.warn(message);
  }
}
