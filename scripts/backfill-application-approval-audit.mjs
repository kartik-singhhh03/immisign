#!/usr/bin/env node
/**
 * Backfill document_audit_events for application_approvals missing audit rows.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const PROVIDER = 'Immimate Approval Portal';
const EMAIL_PROVIDER = 'Resend';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

async function insertAudit(admin, approval, eventType, extra = {}) {
  const fileMeta = {
    original_filename: approval.application_file_name,
    file_size: approval.application_file_size,
    storage_path: approval.application_file_path,
    email_provider: EMAIL_PROVIDER,
  };
  const { error } = await admin.from('document_audit_events').insert({
    agency_id: approval.agency_id,
    client_id: approval.client_id,
    matter_id: approval.matter_id,
    document_type: 'application_approval',
    document_id: approval.id,
    event_type: eventType,
    event_timestamp: extra.eventTimestamp,
    actor_name: extra.actorName ?? null,
    ip_address: extra.ipAddress ?? null,
    provider: PROVIDER,
    metadata: { ...fileMeta, ...extra.metadata, backfill: true },
  });
  if (error && !error.message.includes('duplicate')) {
    console.warn('insert failed', eventType, approval.id, error.message);
    return false;
  }
  return !error;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: approvals } = await admin
  .from('application_approvals')
  .select('*')
  .is('deleted_at', null)
  .in('status', ['sent', 'viewed', 'approved', 'changes_requested']);

let inserted = 0;
for (const approval of approvals || []) {
  const { data: existing } = await admin
    .from('document_audit_events')
    .select('event_type')
    .eq('document_id', approval.id)
    .eq('document_type', 'application_approval');

  const has = new Set((existing || []).map((e) => e.event_type));

  if (approval.sent_at && !has.has('sent')) {
    if (await insertAudit(admin, approval, 'sent', {
      eventTimestamp: approval.sent_at,
      metadata: { email_delivery_status: 'accepted' },
    })) inserted++;
  }
  if (approval.viewed_at && !has.has('viewed')) {
    if (await insertAudit(admin, approval, 'viewed', {
      eventTimestamp: approval.viewed_at,
      ipAddress: approval.client_ip,
    })) inserted++;
  }
  if (approval.approved_at && !has.has('signed')) {
    if (await insertAudit(admin, approval, 'signed', {
      eventTimestamp: approval.approved_at,
      actorName: approval.client_name_confirmed,
      ipAddress: approval.client_ip,
    })) inserted++;
  }
  if (approval.approved_at && !has.has('acknowledged')) {
    if (await insertAudit(admin, approval, 'acknowledged', {
      eventTimestamp: approval.approved_at,
      actorName: approval.client_name_confirmed,
    })) inserted++;
  }
  if (approval.changes_requested_at && !has.has('completed')) {
    if (await insertAudit(admin, approval, 'completed', {
      eventTimestamp: approval.changes_requested_at,
      ipAddress: approval.client_ip,
      metadata: {
        action: 'changes_requested',
        change_reason: approval.change_request_reason,
      },
    })) inserted++;
  }

  // Patch legacy signed rows missing provider / filename metadata
  const { data: legacySigned } = await admin
    .from('document_audit_events')
    .select('id, metadata, actor_name, ip_address')
    .eq('document_id', approval.id)
    .eq('document_type', 'application_approval')
    .eq('event_type', 'signed')
    .is('provider', null);

  for (const row of legacySigned || []) {
    await admin
      .from('document_audit_events')
      .update({
        provider: PROVIDER,
        actor_name: row.actor_name || approval.client_name_confirmed,
        ip_address: row.ip_address || approval.client_ip,
        metadata: {
          ...(row.metadata || {}),
          original_filename: approval.application_file_name,
          file_size: approval.application_file_size,
          storage_path: approval.application_file_path,
          email_provider: EMAIL_PROVIDER,
          backfill: true,
        },
      })
      .eq('id', row.id);
    inserted++;
  }
}

console.log(`Backfill complete: ${inserted} audit event(s). Provider=${PROVIDER}`);
