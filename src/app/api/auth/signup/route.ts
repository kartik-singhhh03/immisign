import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/auth/password-policy';

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

  if (!email || !password || !agencyName || !slug) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json({ error: policy.errors.join(' ') }, { status: 400 });
  }

  const admin = createAdminClient();
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || agencyName;
  const normalizedSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^\w-]/g, '-')
    .replace(/-+/g, '-');

  const { data: existingAgency } = await (admin as any)
    .from('agencies')
    .select('id')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (existingAgency) {
    return NextResponse.json({ error: 'Workspace slug already taken' }, { status: 409 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Signup failed' }, { status: 500 });
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

  return NextResponse.json({
    success: true,
    userId,
    agency_slug: agency.slug,
    email: email.trim().toLowerCase(),
  });
}
