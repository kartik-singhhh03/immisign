import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgreementSigningProvider,
  AgreementSigningSendContext,
  AgreementSigningSendResult,
} from '@/lib/signing/types';
import { NativeAgreementSigningService } from './native-agreement-signing.service';

export class NativeAgreementSigningProvider implements AgreementSigningProvider {
  readonly name = 'native' as const;
  private readonly svc = new NativeAgreementSigningService();

  constructor(private supabase: SupabaseClient) {}

  async sendForSignature(ctx: AgreementSigningSendContext): Promise<AgreementSigningSendResult> {
    const result = await this.svc.sendForSignature({
      supabase: this.supabase,
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      agreementId: ctx.agreementId,
      dispatchOptions: ctx.dispatchOptions,
    });
    return {
      provider: 'native',
      signingToken: result.signingToken,
      signingUrl: result.signingUrl,
    };
  }
}
