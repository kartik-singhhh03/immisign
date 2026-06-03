import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/validation/uuid';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single();

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const { data, error } = await (supabase as any)
    .from('send_document_drafts')
    .select('draft_data, current_step, updated_at')
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft: data || null });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single();

  if (!profile?.agency_id || !isUuid(profile.agency_id)) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const body = await req.json();
  const { draftData, currentStep } = body;

  const { data, error } = await (supabase as any)
    .from('send_document_drafts')
    .upsert(
      {
        agency_id: profile.agency_id,
        user_id: user.id,
        draft_data: draftData || {},
        current_step: typeof currentStep === 'number' ? currentStep : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agency_id,user_id' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, draft: data });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single();

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  await (supabase as any)
    .from('send_document_drafts')
    .delete()
    .eq('agency_id', profile.agency_id)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
