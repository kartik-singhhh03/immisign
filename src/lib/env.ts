/** Required for production builds and runtime (Vercel). */
export const REQUIRED_PRODUCTION_ENV = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SIGNWELL_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_AGENCY_MONTHLY_PRICE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
] as const

export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    if (isProductionBuild()) {
      throw new Error(`${name} is required in production`)
    }
    throw new Error(`${name} is not configured`)
  }
  return value
}

export function getOptionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || fallback
}

export function validateProductionEnv(): void {
  if (!isProductionBuild()) return

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Production build missing required environment variables: ${missing.join(', ')}`
    )
  }
}
