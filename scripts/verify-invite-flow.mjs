import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ownerEmail = process.argv[2] || 'owner@demoagency.com';
const inviteeEmail = process.argv[3] || ownerEmail;

const { data: owner, error: ownerError } = await supabase
  .from('users')
  .select('id,agency_id,email,role')
  .eq('email', ownerEmail)
  .limit(1)
  .single();

if (ownerError || !owner) {
  console.log('INVITE_OWNER_LOOKUP_FAILED', ownerError?.message || 'owner not found');
  process.exit(1);
}

const token = crypto.randomUUID();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);

const { data: invite, error: insertError } = await supabase
  .from('invitations')
  .insert({
    agency_id: owner.agency_id,
    email: inviteeEmail,
    role: 'agent',
    token,
    expires_at: expiresAt.toISOString(),
    created_by: owner.id,
  })
  .select('id,email,agency_id,token,created_at')
  .single();

if (insertError || !invite) {
  console.log('INVITE_INSERT_FAILED', insertError?.message || 'insert failed');
  process.exit(1);
}

const inviteUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;
const headers = {
  Authorization: `Bearer ${env.RESEND_API_KEY}`,
  'Content-Type': 'application/json',
};

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to: [inviteeEmail],
    subject: 'You have been invited to join an ImmiSign Workspace',
    html: `<p>Invite link: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
  }),
});

const body = await emailRes.text();
console.log('INVITE_ROW_CREATED', JSON.stringify(invite, null, 2));
console.log('INVITE_EMAIL_STATUS', emailRes.status);
console.log('INVITE_EMAIL_BODY', body);
