import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationPayload } from './types';

export type ActivityEventInput = {
  agencyId: string;
  actorId?: string | null;
  eventType: string;
  title: string;
  description?: string;
  entityType?: string | null;
  entityId?: string | null;
  clientId?: string | null;
  fileSource?: string | null;
  fileId?: string | null;
  notificationId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createActivityEvent(
  supabase: SupabaseClient,
  input: ActivityEventInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('activity_events')
    .insert({
      agency_id: input.agencyId,
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      title: input.title,
      description: input.description ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      client_id: input.clientId ?? null,
      file_source: input.fileSource ?? null,
      file_id: input.fileId ?? null,
      notification_id: input.notificationId ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error) return null;
  return data?.id ?? null;
}

export function payloadToActivityEvent(
  payload: NotificationPayload,
  notificationId?: string,
): ActivityEventInput {
  return {
    agencyId: payload.agencyId,
    actorId: payload.actorId,
    eventType: payload.type,
    title: payload.title,
    description: payload.message,
    entityType: payload.entityType,
    entityId: payload.entityId,
    clientId: payload.clientId,
    fileSource: payload.fileSource,
    fileId: payload.fileId,
    notificationId,
    metadata: {
      priority: payload.priority ?? 'normal',
      scope: payload.scope ?? 'personal',
      workflow_category: payload.workflowCategory,
    },
  };
}
