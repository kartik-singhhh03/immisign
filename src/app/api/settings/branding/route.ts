import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';
import { formatZodError } from '@/lib/validations/fields';
import { brandingPatchSchema } from '@/lib/validations/schemas';

const BRANDING_FIELDS = [
  'primary_color',
  'secondary_color',
  'logo_url',
  'email_footer',
  'font_family',
  'agreement_ref_prefix',
  'agreement_ref_start',
  'agreement_header_title',
  'agreement_footer_text',
] as const;

export async function PATCH(req: NextRequest) {
  return withApiRoute('PATCH /api/settings/branding', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) {
      return apiError(ctx.error, ctx.status);
    }

    const role = String(ctx.dbRole || '').toLowerCase();
    if (!['owner', 'admin'].includes(role)) {
      return apiError('Only owners and admins can update branding', 403);
    }

    const body = await req.json();
    const parsed = brandingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const payload: Record<string, unknown> = {
      agency_id: ctx.agencyId,
      updated_at: new Date().toISOString(),
    };

    for (const key of BRANDING_FIELDS) {
      if (key in parsed.data) payload[key] = parsed.data[key as keyof typeof parsed.data];
    }

    const { data, error } = await ctx.supabase
      .from('branding_settings')
      .upsert(payload, { onConflict: 'agency_id' })
      .select()
      .single();

    if (error) return apiError(error.message, 500);
    return NextResponse.json({ success: true, branding: data });
  });
}
