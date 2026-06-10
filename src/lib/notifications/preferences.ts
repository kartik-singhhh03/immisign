import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PREFERENCES,
  type NotificationCategory,
  type UserNotificationPreferences,
} from './types';

export async function getUserNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  agencyId: string,
): Promise<UserNotificationPreferences> {
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (data) return data as UserNotificationPreferences;

  return {
    user_id: userId,
    agency_id: agencyId,
    ...DEFAULT_PREFERENCES,
  };
}

function categoryToFlags(category: NotificationCategory): {
  emailKey: keyof UserNotificationPreferences;
  inAppKey: keyof UserNotificationPreferences;
} {
  switch (category) {
    case 'agreement':
      return { emailKey: 'email_agreements', inAppKey: 'in_app_agreements' };
    case 'approval':
    case 'comment':
    case 'checklist':
    case 'reminder':
      return { emailKey: 'email_approvals', inAppKey: 'in_app_approvals' };
    case 'document':
      return { emailKey: 'email_documents', inAppKey: 'in_app_documents' };
    case 'sos':
      return { emailKey: 'email_sos', inAppKey: 'in_app_sos' };
    case 'file_note':
      return { emailKey: 'email_file_notes', inAppKey: 'in_app_file_notes' };
    case 'compliance':
      return { emailKey: 'email_compliance', inAppKey: 'in_app_compliance' };
    case 'team':
      return { emailKey: 'email_team', inAppKey: 'in_app_team' };
    case 'task':
      return { emailKey: 'email_system', inAppKey: 'in_app_system' };
    default:
      return { emailKey: 'email_system', inAppKey: 'in_app_system' };
  }
}

export function shouldSendInApp(
  prefs: UserNotificationPreferences,
  category: NotificationCategory,
): boolean {
  if (!prefs.in_app_enabled) return false;
  const { inAppKey } = categoryToFlags(category);
  return Boolean(prefs[inAppKey]);
}

export function shouldSendEmail(
  prefs: UserNotificationPreferences,
  category: NotificationCategory,
): boolean {
  if (!prefs.email_enabled) return false;
  const { emailKey } = categoryToFlags(category);
  return Boolean(prefs[emailKey]);
}
