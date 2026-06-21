import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export const PROFESSIONAL_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFESSIONAL_SIGNATURE_MIN_WIDTH = 300;
export const PROFESSIONAL_SIGNATURE_MIN_HEIGHT = 100;
export const PROFESSIONAL_SIGNATURE_FILENAME = 'default-signature.png';

export function professionalSignatureStoragePath(agencyId: string, userId: string): string {
  return `${agencyId}/${userId}/${PROFESSIONAL_SIGNATURE_FILENAME}`;
}

export function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  const signature = buffer.toString('ascii', 1, 4);
  if (signature !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function validateProfessionalSignaturePng(
  file: File,
  buffer: Buffer,
): { ok: true } | { ok: false; error: string } {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (mime !== 'image/png' && ext !== 'png') {
    return { ok: false, error: 'Only PNG files are allowed for professional signatures.' };
  }
  if (file.size > PROFESSIONAL_SIGNATURE_MAX_BYTES) {
    return { ok: false, error: 'Signature file must be 2 MB or smaller.' };
  }
  const dims = readPngDimensions(buffer);
  if (!dims) {
    return { ok: false, error: 'Could not read PNG dimensions. Upload a valid PNG file.' };
  }
  if (dims.width < PROFESSIONAL_SIGNATURE_MIN_WIDTH || dims.height < PROFESSIONAL_SIGNATURE_MIN_HEIGHT) {
    return {
      ok: false,
      error: `Signature must be at least ${PROFESSIONAL_SIGNATURE_MIN_WIDTH}×${PROFESSIONAL_SIGNATURE_MIN_HEIGHT}px (yours: ${dims.width}×${dims.height}px).`,
    };
  }
  return { ok: true };
}

export async function logSignatureActivity(
  supabase: SupabaseClient,
  params: {
    agencyId: string;
    userId: string;
    action: 'uploaded' | 'replaced' | 'deleted';
    signatureId?: string | null;
    storagePath?: string | null;
  },
) {
  const titles = {
    uploaded: 'Professional signature uploaded',
    replaced: 'Professional signature replaced',
    deleted: 'Professional signature removed',
  };
  const { error } = await supabase.from('activity_logs').insert({
    agency_id: params.agencyId,
    user_id: params.userId,
    type: `agent_signature.${params.action}`,
    title: titles[params.action],
    description: params.storagePath
      ? `Signature stored at ${params.storagePath}`
      : 'Default agent signature cleared',
    reference_id: params.signatureId ?? null,
    reference_type: 'user_signature',
  });
  if (error) console.error('SIGNATURE_ACTIVITY_LOG_FAILED', error.message);
}

export async function clearUserSignaturePath(userId: string) {
  const admin = createAdminClient();
  await admin
    .from('users')
    .update({
      signature_storage_path: null,
      signature_uploaded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function userHasUploadedProfessionalSignature(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from('users')
    .select('signature_storage_path')
    .eq('id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (userRow?.signature_storage_path) return true;

  const { data: defaultSig } = await admin
    .from('user_signatures')
    .select('id, signature_type, storage_path')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('signature_type', 'upload')
    .maybeSingle();

  return Boolean(defaultSig?.storage_path);
}
