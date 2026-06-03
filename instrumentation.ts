export async function register() {
  if (process.env.NODE_ENV !== 'production') return

  const { validateRuntimeEnv } = await import('./src/lib/env')
  validateRuntimeEnv()
}
