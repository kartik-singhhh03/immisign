import { getRequiredEnv, isProductionBuild } from './env'

export const isProduction = isProductionBuild()

/** Public Supabase settings — never expose service role or API secrets here. */
export function getPublicSupabaseConfig() {
  return {
    supabaseUrl: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  }
}

export const publicEnv = isProduction
  ? getPublicSupabaseConfig()
  : {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    }
