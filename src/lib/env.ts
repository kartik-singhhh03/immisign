/** Inlined into the client bundle — must exist at build time. */
export const REQUIRED_BUILD_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

/** Required when the server handles traffic (API routes, webhooks, email). */
export const REQUIRED_RUNTIME_ENV = [
  'NEXT_PUBLIC_APP_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SIGNWELL_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_IMMISIGN_BASE_PRICE_ID',
  'STRIPE_IMMISIGN_SEAT_PRICE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
] as const

/** @deprecated Use REQUIRED_BUILD_ENV + REQUIRED_RUNTIME_ENV */
export const REQUIRED_PRODUCTION_ENV = [
  ...REQUIRED_BUILD_ENV,
  ...REQUIRED_RUNTIME_ENV,
] as const

export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isVercel(): boolean {
  return process.env.VERCEL === '1'
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function getOptionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || fallback
}

/** Called from next.config.mjs — only checks vars needed to compile the app. */
export function validateBuildEnv(): void {
  if (!isProductionBuild()) return

  const missing = REQUIRED_BUILD_ENV.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Production build missing required environment variables: ${missing.join(', ')}`
    )
  }
}

/** Called at server startup — checks secrets and third-party integrations. */
export function validateRuntimeEnv(): void {
  if (!isProductionBuild()) return

  const missing = REQUIRED_RUNTIME_ENV.filter((key) => {
    if (key === 'NEXT_PUBLIC_APP_URL') {
      return !resolveAppUrl(false)
    }
    return !process.env[key]?.trim()
  })

  if (missing.length > 0) {
    throw new Error(
      `Production runtime missing required environment variables: ${missing.join(', ')}`
    )
  }
}

/** @deprecated Use validateBuildEnv or validateRuntimeEnv */
export function validateProductionEnv(): void {
  validateBuildEnv()
  validateRuntimeEnv()
}

/**
 * Resolves the public app URL. On Vercel, falls back to VERCEL_URL when
 * NEXT_PUBLIC_APP_URL is not set (preview deployments).
 */
export function resolveAppUrl(throwIfMissing = true): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (explicit) return explicit

  const vercelHost = process.env.VERCEL_URL?.trim()
  if (vercelHost) return `https://${vercelHost}`

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000'
  }

  if (throwIfMissing) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is required in production (or deploy on Vercel with VERCEL_URL available)'
    )
  }

  return null
}

/** Detect dev port / host mismatch between NEXT_PUBLIC_APP_URL and the running server. */
export function detectAppUrlMismatch(): {
  configured: string;
  detected: string;
  portMismatch: boolean;
} | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!configured) return null;

  const devPort = process.env.PORT?.trim() || '3000';
  const detected =
    process.env.NODE_ENV === 'production'
      ? configured
      : `http://localhost:${devPort}`;

  try {
    const cfg = new URL(configured);
    const det = new URL(detected);
    const portMismatch = cfg.port !== det.port || cfg.hostname !== det.hostname;
    if (!portMismatch) return null;
    return { configured, detected, portMismatch: true };
  } catch {
    return null;
  }
}

/** Log APP URL warnings at server startup (dev + production). */
export function warnAppUrlMismatch(): void {
  const mismatch = detectAppUrlMismatch();
  if (mismatch) {
    console.warn(
      `[env] NEXT_PUBLIC_APP_URL mismatch: configured=${mismatch.configured} detected=${mismatch.detected}. Email and webhook deep links may be wrong.`,
    );
  }
}
