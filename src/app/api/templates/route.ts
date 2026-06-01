import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { guards, requireSession, forbidUnless } from '@/lib/auth/api-auth';

export async function GET() {
  const session = await requireSession();
  if ('response' in session) return session.response;

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('templates')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if ('response' in session) return session.response;

  const forbidden = forbidUnless(
    session.profile,
    guards.templatesWrite,
    'Your role cannot create templates',
  );
  if (forbidden) return forbidden;

  const body = await req.json();
  const { name, description, content } = body as {
    name?: string;
    description?: string;
    content?: unknown;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('templates')
    .insert({
      agency_id: session.profile.agency_id,
      name: name.trim(),
      description: description?.trim() || null,
      content: content ?? { html: '<p>New template</p>' },
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ template: data });
}
