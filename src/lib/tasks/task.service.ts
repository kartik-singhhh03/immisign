import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService, buildWorkspaceActionUrl } from '@/lib/notifications/notification.service';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export class TaskService {
  private notifications: NotificationService;

  constructor(private supabase: SupabaseClient) {
    this.notifications = new NotificationService(supabase);
  }

  async create(params: {
    agencyId: string;
    agencySlug: string;
    createdBy: string;
    title: string;
    description?: string;
    assignedTo?: string;
    entityType?: string;
    entityId?: string;
    dueAt?: string;
  }) {
    const { data, error } = await this.supabase
      .from('agency_tasks')
      .insert({
        agency_id: params.agencyId,
        title: params.title,
        description: params.description ?? null,
        assigned_to: params.assignedTo ?? null,
        assigned_by: params.assignedTo ? params.createdBy : null,
        created_by: params.createdBy,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        due_at: params.dueAt ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    if (params.assignedTo && params.assignedTo !== params.createdBy) {
      await this.notifications.notify({
        agencyId: params.agencyId,
        userId: params.assignedTo,
        type: 'task',
        title: 'Task assigned',
        message: params.title,
        actionUrl: buildWorkspaceActionUrl(params.agencySlug, '/dashboard'),
        entityType: 'task',
        entityId: data.id,
        actorId: params.createdBy,
      });
    }

    return data;
  }

  async updateStatus(
    taskId: string,
    agencyId: string,
    userId: string,
    status: TaskStatus,
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agency_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('agency_id', agencyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async listForUser(agencyId: string, userId: string, options: { status?: TaskStatus; limit?: number } = {}) {
    let query = this.supabase
      .from('agency_tasks')
      .select('*')
      .eq('agency_id', agencyId)
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 20);

    if (options.status) query = query.eq('status', options.status);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('agency_tasks')) {
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async listOpen(agencyId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('agency_tasks')
      .select('*')
      .eq('agency_id', agencyId)
      .in('status', ['pending', 'in_progress'])
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('agency_tasks')) {
        return [];
      }
      throw error;
    }
    return data || [];
  }
}
