import { createAdminClient } from '@/lib/supabase/admin';

export type EmailDeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

export async function recordEmailDelivery(input: {
  recipient: string;
  subject: string;
  resendId?: string | null;
  status?: EmailDeliveryStatus;
  emailType?: string | null;
  agencyId?: string | null;
  error?: string | null;
}): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('email_delivery_audit')
      .insert({
        provider: 'resend',
        recipient: input.recipient,
        subject: input.subject,
        resend_id: input.resendId ?? null,
        status: input.status ?? (input.resendId ? 'accepted' : 'pending'),
        email_type: input.emailType ?? null,
        agency_id: input.agencyId ?? null,
        error: input.error ?? null,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[email-delivery-audit] insert failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn('[email-delivery-audit] insert exception:', e);
    return null;
  }
}

export async function updateEmailDeliveryByResendId(
  resendId: string,
  update: {
    status: EmailDeliveryStatus;
    deliveredAt?: string | null;
    error?: string | null;
  },
) {
  try {
    const admin = createAdminClient();
    const patch: Record<string, unknown> = {
      status: update.status,
      error: update.error ?? null,
    };
    if (update.deliveredAt) {
      patch.delivered_at = update.deliveredAt;
    }
    await admin.from('email_delivery_audit').update(patch).eq('resend_id', resendId);
  } catch (e) {
    console.warn('[email-delivery-audit] update failed:', e);
  }
}

export async function getEmailDeliveryStats() {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: lastSent } = await admin
    .from('email_delivery_audit')
    .select('created_at, subject, recipient, status')
    .in('status', ['accepted', 'sent', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastDelivered } = await admin
    .from('email_delivery_audit')
    .select('delivered_at, subject, recipient')
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: failed24h } = await admin
    .from('email_delivery_audit')
    .select('*', { count: 'exact', head: true })
    .in('status', ['failed', 'bounced'])
    .gte('created_at', since);

  return {
    lastEmailSent: lastSent,
    lastEmailDelivered: lastDelivered,
    failedEmails24h: failed24h ?? 0,
  };
}
