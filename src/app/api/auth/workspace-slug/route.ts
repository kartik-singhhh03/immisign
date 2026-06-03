import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildSlugSuggestions,
  normalizeWorkspaceSlug,
  validateWorkspaceSlug,
} from '@/lib/workspace/slug';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('slug')?.trim() ?? '';
  const validation = validateWorkspaceSlug(raw || 'x');

  if (!raw) {
    return NextResponse.json({ error: 'slug query parameter is required' }, { status: 400 });
  }

  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      slug: normalizeWorkspaceSlug(raw),
      error: validation.error,
      suggestions: buildSlugSuggestions(normalizeWorkspaceSlug(raw) || 'workspace'),
    });
  }

  const admin = createAdminClient();
  const { data: existing } = await (admin as any)
    .from('agencies')
    .select('id, name')
    .eq('slug', validation.slug)
    .maybeSingle();

  const available = !existing;

  return NextResponse.json({
    available,
    slug: validation.slug,
    takenBy: existing ? (existing as { name?: string }).name : null,
    suggestions: available ? [] : buildSlugSuggestions(validation.slug),
  });
}
