import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type RmaSignatureMode = 'upload' | 'typed';

export type ResolvedRmaSignature = {
  userId: string;
  fullName: string;
  email: string;
  marn: string | null;
  mode: RmaSignatureMode;
  signatureUrl: string | null;
  signatureText: string | null;
  /** HTML snippet for embedding in agreement PDF preview */
  imageHtml: string;
};

const AGENT_SIGNER_ROLES = new Set([
  'migration agent',
  'migration_agent',
  'agent',
  'rma',
  'owner',
  'admin',
]);

export function isAgentSignerRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return AGENT_SIGNER_ROLES.has(role.toLowerCase().replace(/\s+/g, '_'));
}

export async function loadRmaSignatureForUser(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
): Promise<ResolvedRmaSignature | null> {
  const { data: user } = await supabase
    .from('users')
    .select('full_name, email, signature_storage_path')
    .eq('id', userId)
    .eq('agency_id', agencyId)
    .single();

  if (!user) return null;

  const { data: rma } = await supabase
    .from('rmas')
    .select('mara_number, signature_mode, signature_url, signature_text')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: defaultSig } = await (admin as SupabaseClient)
    .from('user_signatures')
    .select('signature_type, storage_path, typed_name, draw_data')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  let mode = (rma?.signature_mode as RmaSignatureMode | null) || null;
  let signatureUrl = rma?.signature_url || null;
  let signatureText = rma?.signature_text || null;

  // Professional PNG upload (My Profile) always takes precedence for agreement PDF embedding
  const professionalPath =
    (defaultSig?.signature_type === 'upload' && defaultSig.storage_path) ||
    user.signature_storage_path ||
    null;

  if (professionalPath) {
    mode = 'upload';
    signatureUrl = professionalPath;
    signatureText = null;
  } else if (!mode && defaultSig) {
    if (defaultSig.signature_type === 'type' && defaultSig.typed_name) {
      mode = 'typed';
      signatureText = defaultSig.typed_name;
    } else if (defaultSig.signature_type === 'draw' && defaultSig.draw_data) {
      mode = 'upload';
      signatureUrl = defaultSig.draw_data;
    }
  }

  if (!mode) {
    mode = 'typed';
    signatureText = user.full_name;
  }

  const imageHtml = await buildSignatureImageHtml(
    supabase,
    mode,
    signatureUrl,
    signatureText,
    user.full_name,
    { embedForPdf: true },
  );

  return {
    userId,
    fullName: user.full_name,
    email: user.email,
    marn: rma?.mara_number || null,
    mode,
    signatureUrl,
    signatureText,
    imageHtml,
  };
}

export async function buildSignatureImageHtml(
  supabase: SupabaseClient,
  mode: RmaSignatureMode,
  signatureUrl: string | null,
  signatureText: string | null,
  fallbackName: string,
  options?: { embedForPdf?: boolean },
): Promise<string> {
  if (mode === 'typed' && signatureText?.trim()) {
    return `<div class="sig-typed" style="font-family:'Brush Script MT', 'Segoe Script', cursive; font-size:28px; color:#0f172a;">${escapeHtml(signatureText.trim())}</div>`;
  }

  if (mode === 'upload' && signatureUrl) {
    let src = signatureUrl;
    if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
      if (options?.embedForPdf) {
        src = await loadSignatureDataUri(signatureUrl);
      } else {
        const admin = createAdminClient();
        const { data: signed } = await admin.storage
          .from('signatures')
          .createSignedUrl(signatureUrl, 3600);
        if (signed?.signedUrl) src = signed.signedUrl;
      }
    }
    if (!src) {
      return `<div class="sig-typed" style="font-family:'Brush Script MT', cursive; font-size:28px;">${escapeHtml(fallbackName)}</div>`;
    }
    const safeSrc = src.replace(/"/g, '&quot;');
    return `<img src="${safeSrc}" alt="Signature" style="max-height:48px; max-width:220px; object-fit:contain; display:block;" />`;
  }

  return `<div class="sig-typed" style="font-family:'Brush Script MT', cursive; font-size:28px;">${escapeHtml(fallbackName)}</div>`;
}

async function loadSignatureDataUri(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('signatures').download(storagePath);
  if (error || !data) {
    const { data: signed } = await admin.storage.from('signatures').createSignedUrl(storagePath, 3600);
    return signed?.signedUrl || '';
  }
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function filterExternalDocumentSigners<T extends { email?: string; role?: string }>(
  signers: T[],
  senderEmail: string,
): T[] {
  const sender = senderEmail.trim().toLowerCase();
  return signers.filter((s) => {
    const email = (s.email || '').trim().toLowerCase();
    if (email && email === sender) return false;
    if (isAgentSignerRole(s.role)) return false;
    return true;
  });
}
