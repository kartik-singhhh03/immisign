export const isSafeDevMode = 
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const envConfigs = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  signwellApiKey: process.env.SIGNWELL_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
};
