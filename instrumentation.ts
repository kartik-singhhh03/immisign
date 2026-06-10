export async function register() {
  const { validateRuntimeEnv, warnAppUrlMismatch } = await import('./src/lib/env')
  warnAppUrlMismatch()
  if (process.env.NODE_ENV !== 'production') return
  validateRuntimeEnv()
}
