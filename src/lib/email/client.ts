import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not defined. Email dispatch will fail in production.');
}

export const resendClient = new Resend(process.env.RESEND_API_KEY || 're_dummy_fallback');

// Helper to inject branding dynamically
export interface AgencyBranding {
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
}
