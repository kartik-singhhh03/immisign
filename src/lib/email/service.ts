import { resendClient, AgencyBranding } from './client';
import { createAdminClient } from '../supabase/admin';
import * as React from 'react';
import { render } from '@react-email/render';
import AgreementSentEmail from '@/emails/agreements/agreement-sent';
import WelcomeEmail from '@/emails/auth/welcome';
import PasswordResetEmail from '@/emails/auth/password-reset';
import InvitationEmail from '@/emails/agency/invitation';
import SubscriptionUpdatedEmail from '@/emails/billing/subscription-updated';

const templateRegistry: Record<string, any> = {
    'agreement_sent': AgreementSentEmail,
    'welcome': WelcomeEmail,
    'password_reset': PasswordResetEmail,
    'invitation': InvitationEmail,
    'subscription_updated': SubscriptionUpdatedEmail,
};

export class EmailService {
    async dispatch(jobId: string) {
         const admin = createAdminClient();
         
         const { data: job, error: jobErr } = await admin
             .from('email_jobs')
             .select('*, agency:agencies(name, logo_url, branding_settings(*))')
             .eq('id', jobId)
             .single();
             
         if (jobErr || !job) {
             throw new Error('Job mapping unavailable: NOT_FOUND');
         }

         const TemplateComponent = templateRegistry[job.type];
         if (!TemplateComponent) throw new Error('Template map missing natively: INTERNAL_ERROR');

         const agencyContext = Array.isArray(job.agency) ? job.agency[0] : job.agency;
         const brandingSettings = agencyContext?.branding_settings?.[0] || {};
         
         const brandingData = {
              logo_url: brandingSettings.logo_url || agencyContext?.logo_url,
              primary_color: brandingSettings.primary_color || '#0f172a'
         };

         const payloadData = (typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload) || {};
         const subject = payloadData.subject || 'Notification from ImmiSign';

         const htmlOutput = await render(
             React.createElement(TemplateComponent, {
                 ...payloadData,
                 agencyBranding: brandingData
             })
         );

         try {
             // 4. Mark processing
             await admin.from('email_jobs').update({
                  status: 'processing',
                  updated_at: new Date().toISOString()
             }).eq('id', jobId);

              const res = await resendClient.emails.send({
                  from: process.env.RESEND_FROM_EMAIL || 'support@immisign.app',
                  to: [job.recipient],
                  subject: subject,
                  html: htmlOutput as string,
                  tags: [
                      { name: 'job_id', value: jobId },
                      { name: 'agency_id', value: job.agency_id || '' }
                  ]
              });

              if (res.error) throw new Error(res.error.message);

              await admin.from('email_jobs').update({
                  status: 'sent',
                  resend_id: res.data?.id,
                  sent_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
              }).eq('id', jobId);

         } catch (error: any) {
             console.error('Dispatch fault:', error);
             await admin.from('email_jobs').update({
                  status: 'failed',
                  error_message: error.message,
                  updated_at: new Date().toISOString()
              }).eq('id', jobId);
             throw error;
         }
    }
}

export const emailService = new EmailService();
