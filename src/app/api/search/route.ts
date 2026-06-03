import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/search', async () => {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return apiError(ctx.error, ctx.status);
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }

  const pattern = `%${q}%`;
  const prefix = `/workspace/${ctx.agencySlug}`;

  const [clients, agreements, approvals, documents, users, tasks] = await Promise.all([
    ctx.supabase
      .from('clients')
      .select('id, name, email')
      .eq('agency_id', ctx.agencyId)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    ctx.supabase
      .from('agreements')
      .select('id, title, status')
      .eq('agency_id', ctx.agencyId)
      .ilike('title', pattern)
      .limit(5),
    ctx.supabase
      .from('application_approvals')
      .select('id, title, approval_number, status')
      .eq('agency_id', ctx.agencyId)
      .is('deleted_at', null)
      .or(`title.ilike.${pattern},approval_number.ilike.${pattern}`)
      .limit(5),
    ctx.supabase
      .from('documents')
      .select('id, file_name, status')
      .eq('agency_id', ctx.agencyId)
      .ilike('file_name', pattern)
      .limit(5),
    ctx.supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', ctx.agencyId)
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    ctx.supabase
      .from('agency_tasks')
      .select('id, title, status')
      .eq('agency_id', ctx.agencyId)
      .ilike('title', pattern)
      .limit(5),
  ]);

  const results: {
    type: string;
    id: string;
    label: string;
    sublabel?: string;
    href: string;
  }[] = [];

  (clients.data || []).forEach((c) =>
    results.push({
      type: 'client',
      id: c.id,
      label: c.name,
      sublabel: c.email,
      href: `${prefix}/clients`,
    }),
  );
  (agreements.data || []).forEach((a) =>
    results.push({
      type: 'agreement',
      id: a.id,
      label: a.title,
      sublabel: a.status,
      href: `${prefix}/agreements/${a.id}`,
    }),
  );
  (approvals.data || []).forEach((a) =>
    results.push({
      type: 'approval',
      id: a.id,
      label: a.approval_number || a.title,
      sublabel: a.status,
      href: `${prefix}/approvals/${a.id}`,
    }),
  );
  (documents.data || []).forEach((d) =>
    results.push({
      type: 'document',
      id: d.id,
      label: d.file_name,
      sublabel: d.status,
      href: `${prefix}/documents/library`,
    }),
  );
  (users.data || []).forEach((u) =>
    results.push({
      type: 'user',
      id: u.id,
      label: u.full_name || u.email,
      sublabel: u.role,
      href: `${prefix}/settings?section=RmaTeam`,
    }),
  );
  (tasks.data || []).forEach((t) =>
    results.push({
      type: 'task',
      id: t.id,
      label: t.title,
      sublabel: t.status,
      href: `${prefix}/dashboard`,
    }),
  );

  return NextResponse.json({ success: true, results });
  });
}
