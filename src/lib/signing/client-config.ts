export type SigningProviderName = 'native' | 'signwell';

/** Client-safe signing provider (mirrors server SIGNING_PROVIDER). */
export function getClientSigningProvider(): SigningProviderName {
  const raw = (process.env.NEXT_PUBLIC_SIGNING_PROVIDER || 'native').trim().toLowerCase();
  return raw === 'signwell' ? 'signwell' : 'native';
}

export function isNativeSigningClient(): boolean {
  return getClientSigningProvider() === 'native';
}
