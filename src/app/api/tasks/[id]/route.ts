import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { TaskService, type TaskStatus } from '@/lib/tasks/task.service';
import { apiError, withApiRoute } from '@/lib/api/json-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return withApiRoute('PATCH /api/tasks/[id]', async () => {
    const ctx = await getWorkspaceApiContext();
    if ('error' in ctx) return apiError(ctx.error, ctx.status);

    const body = await req.json();
    const service = new TaskService(ctx.supabase);
    const task = await service.updateStatus(
      params.id,
      ctx.agencyId,
      ctx.userId,
      body.status as TaskStatus,
    );

    return NextResponse.json({ success: true, task });
  });
}
