import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { guards, requireSession, forbidUnless } from '@/lib/auth/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession();
  if ('response' in session) return session.response;

  const forbidden = forbidUnless(
    session.profile,
    guards.templatesWrite,
    'Your role cannot edit templates',
  );
  if (forbidden) return forbidden;

  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('templates')
    .update({
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.description != null ? { description: body.description } : {}),
      ...(body.content != null ? { content: body.content } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ template: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession();
  if ('response' in session) return session.response;

  const forbidden = forbidUnless(
    session.profile,
    guards.templatesWrite,
    'Your role cannot delete templates',
  );
  if (forbidden) return forbidden;

  const supabase = await createClient();
  const { error } = await (supabase as any).from('templates').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
