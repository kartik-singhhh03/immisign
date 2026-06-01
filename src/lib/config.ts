/** Mock auth/data only when explicitly running local dev without Supabase configured. */
export const isSafeDevMode =
  process.env.NODE_ENV === 'development' &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Public Supabase settings only — never expose service role or API secrets here. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
};

export const isProduction =
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
