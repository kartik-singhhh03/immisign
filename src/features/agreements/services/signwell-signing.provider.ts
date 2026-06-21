import type { SupabaseClient } from '@supabase/supabase-js';
import { SignWellService } from './signwell.service';
import type {
  AgreementSigningProvider,
  AgreementSigningSendContext,
  AgreementSigningSendResult,
} from '@/lib/signing/types';

/** Adapter — delegates to existing SignWellService without modification. */
export class SignwellAgreementSigningProvider implements AgreementSigningProvider {
  readonly name = 'signwell' as const;

  constructor(private supabase: SupabaseClient) {}

  async sendForSignature(ctx: AgreementSigningSendContext): Promise<AgreementSigningSendResult> {
    const service = new SignWellService(this.supabase);
    const sentDoc = await service.sendForSignature(
      ctx.agencyId,
      ctx.userId,
      ctx.role,
      ctx.agreementId,
    );
    return {
      provider: 'signwell',
      signwellDocumentId: (sentDoc as { id?: string })?.id ?? null,
      signingUrl: (sentDoc as { signing_url?: string })?.signing_url ?? null,
    };
  }
}
