export type SigningProviderName = 'native' | 'signwell';

const VALID: SigningProviderName[] = ['native', 'signwell'];

/** Resolve signing provider from env. Default: native. */
export function getSigningProvider(): SigningProviderName {
  const raw = (process.env.SIGNING_PROVIDER || 'native').trim().toLowerCase();
  if (VALID.includes(raw as SigningProviderName)) {
    return raw as SigningProviderName;
  }
  return 'native';
}

export function isNativeSigningEnabled(): boolean {
  return getSigningProvider() === 'native';
}

export function isSignwellSigningEnabled(): boolean {
  return getSigningProvider() === 'signwell';
}
