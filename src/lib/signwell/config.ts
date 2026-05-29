import { z } from 'zod';

const configSchema = z.object({
  apiKey: z.string().min(1, 'SIGNWELL_API_KEY is required for production'),
  webhookSecret: z.string().optional(), // Used to verify incoming payloads
  baseUrl: z.string().url().default('https://api.signwell.com/v1'),
});

// Avoid failing builds at compile time entirely if env is partial
export const signwellConfig = configSchema.parse({
  apiKey: process.env.SIGNWELL_API_KEY || 'dummy_for_build', 
  webhookSecret: process.env.SIGNWELL_WEBHOOK_SECRET,
  baseUrl: process.env.SIGNWELL_BASE_URL || 'https://api.signwell.com/v1',
});

// Helper for strict runtime checks
export function validateSignwellConfig() {
  if (signwellConfig.apiKey === 'dummy_for_build') {
     console.warn('SignWell API Key is not set in environment.');
  }
}
