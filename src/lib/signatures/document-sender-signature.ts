import type { SupabaseClient } from '@supabase/supabase-js';
import { loadRmaSignatureForUser } from './rma-signature';

export async function applySenderSignatureOnDocumentSend(
  supabase: SupabaseClient,
  agencyId: string,
  documentId: string,
  senderUserId: string,
): Promise<{
  senderSignedAt: string;
  senderSignatureUrl: string | null;
  senderSignatureText: string | null;
}> {
  const signature = await loadRmaSignatureForUser(supabase, agencyId, senderUserId);
  if (!signature) {
    throw new Error(
      'Sender has no signature configured. Set up signature in RMA Team settings.',
    );
  }

  const signedAt = new Date().toISOString();

  await supabase
    .from('documents')
    .update({
      sender_signed_at: signedAt,
      sender_signature_url: signature.signatureUrl,
      sender_signature_text: signature.signatureText,
      sender_user_id: senderUserId,
    })
    .eq('id', documentId)
    .eq('agency_id', agencyId);

  return {
    senderSignedAt: signedAt,
    senderSignatureUrl: signature.signatureUrl,
    senderSignatureText: signature.signatureText,
  };
}
