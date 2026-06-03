import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/auth/password-policy';
import {
  buildSlugSuggestions,
  normalizeWorkspaceSlug,
  slugifyAgencyName,
  validateWorkspaceSlug,
} from '@/lib/workspace/slug';

async function isSlugAvailable(admin: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await (admin as any)
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !data;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    email,
    password,
    firstName,
    lastName,
    agencyName,
    slug,
    marn,
  } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    agencyName?: string;
    slug?: string;
    marn?: string;
  };

  if (!email || !password || !agencyName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json({ error: policy.errors.join(' ') }, { status: 400 });
  }

  const preferredSlug = slug?.trim()
    ? normalizeWorkspaceSlug(slug)
    : slugifyAgencyName(agencyName);

  const slugValidation = validateWorkspaceSlug(preferredSlug || slugifyAgencyName(agencyName));
  if (!slugValidation.valid) {
    return NextResponse.json({ error: slugValidation.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || agencyName;

  let normalizedSlug = slugValidation.slug;
  if (!(await isSlugAvailable(admin, normalizedSlug))) {
    for (const suggestion of buildSlugSuggestions(normalizedSlug, 8)) {
      if (await isSlugAvailable(admin, suggestion)) {
        normalizedSlug = suggestion;
        break;
      }
    }
    if (!(await isSlugAvailable(admin, normalizedSlug))) {
      return NextResponse.json(
        {
          error:
            'This workspace URL is already in use. Try a different URL or add your city or registration number.',
          code: 'SLUG_TAKEN',
          slug: slugValidation.slug,
          suggestions: buildSlugSuggestions(slugValidation.slug),
        },
        { status: 409 },
      );
    }
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    const msg = authError?.message || 'Signup failed';
    if (/already registered|already exists/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Sign in instead, or use password reset.',
          code: 'EMAIL_EXISTS',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const userId = authData.user.id;

  const { data: agency, error: agencyError } = await (admin as any)
    .from('agencies')
    .insert({
      name: agencyName.trim(),
      slug: normalizedSlug,
    })
    .select('id, slug, name')
    .single();

  if (agencyError) {
    await admin.auth.admin.deleteUser(userId);
    if (agencyError.code === '23505') {
      return NextResponse.json(
        {
          error: 'This workspace URL was just claimed. Please pick another URL.',
          code: 'SLUG_TAKEN',
          suggestions: buildSlugSuggestions(slugValidation.slug),
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: agencyError.message }, { status: 500 });
  }

  const { error: userError } = await (admin as any).from('users').insert({
    id: userId,
    agency_id: agency.id,
    full_name: fullName,
    email: email.trim().toLowerCase(),
    role: 'owner',
    job_title: marn ? `MARN ${marn}` : 'Agency Owner',
    is_active: true,
    email_verified: true,
  });

  if (userError) {
    await admin.auth.admin.deleteUser(userId);
    await (admin as any).from('agencies').delete().eq('id', agency.id);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const slugAdjusted = normalizedSlug !== slugValidation.slug;

  return NextResponse.json({
    success: true,
    userId,
    agency_slug: agency.slug,
    email: email.trim().toLowerCase(),
    slug_adjusted: slugAdjusted,
    requested_slug: slugValidation.slug,
  });
}
