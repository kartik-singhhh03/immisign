import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { TaskService } from '@/lib/tasks/task.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function GET(req: NextRequest) {
  return withApiRoute('GET /api/tasks', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const sp = req.nextUrl.searchParams;
    const mine = sp.get('mine') === 'true';
    const service = new TaskService(ctx.supabase);

    if (mine) {
      const tasks = await service.listForUser(ctx.agencyId, ctx.userId, {
        status: sp.get('status') as 'pending' | undefined,
        limit: Number(sp.get('limit') || 20),
      });
      return NextResponse.json({ success: true, data: tasks });
    }

    const tasks = await service.listOpen(ctx.agencyId, Number(sp.get('limit') || 20));
    return NextResponse.json({ success: true, data: tasks });
  });
}

export async function POST(req: NextRequest) {
  return withApiRoute('POST /api/tasks', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const service = new TaskService(ctx.supabase);
    const task = await service.create({
      agencyId: ctx.agencyId,
      agencySlug: ctx.agencySlug,
      createdBy: ctx.userId,
      title: body.title,
      description: body.description,
      assignedTo: body.assigned_to,
      entityType: body.entity_type,
      entityId: body.entity_id,
      dueAt: body.due_at,
    });

    return NextResponse.json({ success: true, task });
  });
}
