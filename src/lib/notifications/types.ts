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
  | 'billing';

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
};

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
};
