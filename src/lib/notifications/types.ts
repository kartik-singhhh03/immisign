export type NotificationCategory =
  | 'agreement'
  | 'approval'
  | 'team'
  | 'comment'
  | 'checklist'
  | 'document'
  | 'reminder'
  | 'system'
  | 'task'
  | 'billing'
  | 'sos'
  | 'file_note'
  | 'compliance';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type NotificationScope = 'personal' | 'team' | 'system';

export type WorkflowCategory =
  | 'agreements'
  | 'approvals'
  | 'sos'
  | 'file_notes'
  | 'compliance'
  | 'system'
  | 'team';

export type NotificationAction = {
  id: string;
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary';
};

export type NotificationPayload = {
  agencyId: string;
  userId: string;
  type: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  emailTemplate?: string;
  emailSubject?: string;
  emailHtml?: string;
  priority?: NotificationPriority;
  scope?: NotificationScope;
  assignedToUserId?: string;
  dueAt?: string;
  workflowCategory?: WorkflowCategory;
  clientId?: string;
  fileSource?: string;
  fileId?: string;
  actions?: NotificationAction[];
  skipActivityEvent?: boolean;
};

export type EmailDigestFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export type UserNotificationPreferences = {
  user_id: string;
  agency_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  email_agreements: boolean;
  email_approvals: boolean;
  email_documents: boolean;
  email_team: boolean;
  email_system: boolean;
  in_app_agreements: boolean;
  in_app_approvals: boolean;
  in_app_documents: boolean;
  in_app_team: boolean;
  in_app_system: boolean;
  email_compliance: boolean;
  in_app_compliance: boolean;
  email_sos: boolean;
  in_app_sos: boolean;
  email_file_notes: boolean;
  in_app_file_notes: boolean;
  email_digest_frequency: EmailDigestFrequency;
  last_digest_sent_at?: string | null;
};

export const DEFAULT_PREFERENCES: Omit<UserNotificationPreferences, 'user_id' | 'agency_id'> = {
  email_enabled: true,
  in_app_enabled: true,
  email_agreements: true,
  email_approvals: true,
  email_documents: true,
  email_team: true,
  email_system: true,
  in_app_agreements: true,
  in_app_approvals: true,
  in_app_documents: true,
  in_app_team: true,
  in_app_system: true,
  email_compliance: true,
  in_app_compliance: true,
  email_sos: true,
  in_app_sos: true,
  email_file_notes: true,
  in_app_file_notes: true,
  email_digest_frequency: 'immediate',
};

export type NotificationRecord = {
  id: string;
  agency_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  priority: NotificationPriority;
  scope: NotificationScope;
  assigned_to_user_id: string | null;
  due_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  workflow_category: WorkflowCategory | null;
  metadata: {
    actions?: NotificationAction[];
    file_source?: string;
    file_id?: string;
    client_id?: string;
    [key: string]: unknown;
  };
};
