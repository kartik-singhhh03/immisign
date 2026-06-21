import type { SupabaseClient } from '@supabase/supabase-js';
import { getSigningProvider } from './config';
import type { AgreementSigningProvider } from './types';
import { NativeAgreementSigningProvider } from '@/features/agreements/services/native-signing.provider';
import { SignwellAgreementSigningProvider } from '@/features/agreements/services/signwell-signing.provider';

export function createAgreementSigningProvider(
  supabase: SupabaseClient,
  override?: 'native' | 'signwell',
): AgreementSigningProvider {
  const name = override ?? getSigningProvider();
  if (name === 'signwell') {
    return new SignwellAgreementSigningProvider(supabase);
  }
  return new NativeAgreementSigningProvider(supabase);
}
