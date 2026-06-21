#!/usr/bin/env node
/** Apply agreement rebuild v2 data via Supabase service role (no Postgres CLI). */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const LEGACY_NAMES = [
  'Partner Visa (Onshore/Offshore)',
  'Skilled Migration',
  'Employer Sponsored',
  'Parent Visa',
  'Student Visa',
  'Visitor Visa',
  'Bridging Visa',
  'Aged Dependent Relative',
  'ART Appeal / Merits Review',
  'Character / Health Waiver',
];

const AVC_TYPES = [
  { name: 'Visa Application', sort_order: 1, subclass_placeholder: 'e.g. 820, 804, 482' },
  { name: 'ART Appeal', sort_order: 2, subclass_placeholder: 'e.g. ART review reference' },
  { name: 'Skill Assessment', sort_order: 3, subclass_placeholder: 'e.g. ACS, VETASSESS' },
  { name: 'PSA', sort_order: 4, subclass_placeholder: 'Professional Services Agreement' },
  { name: 'JRP', sort_order: 5, subclass_placeholder: 'Job Ready Program' },
];

const CLAUSES = [
  { clause_key: 'appointment_of_agent', title: 'Appointment of Agent', order_index: 4, content: 'The Client appoints the Agent as their registered migration agent to act on their behalf in relation to the matter described in Section 1. The Agent is authorised to provide immigration assistance in accordance with the Migration Act 1958 (Cth) and the MARA Code of Conduct.', is_mandatory: true },
  { clause_key: 'code_of_conduct', title: 'Code of Conduct', order_index: 5, content: 'The Agent will act in accordance with the Registered Migration Agent Code of Conduct (March 2022). The Client acknowledges that a copy of the Code of Conduct is available from the Office of the Migration Agents Registration Authority at www.mara.gov.au.', is_mandatory: true },
  { clause_key: 'services_to_be_provided', title: 'Services to be Provided', order_index: 6, content: 'The services to be provided by the Agent are set out in Section 2 (Scope of Work) of this Agreement. The Agent will provide those services with reasonable skill, care and diligence.', is_mandatory: true },
  { clause_key: 'client_agrees', title: 'Client Agrees', order_index: 7, content: 'The Client agrees to provide complete, accurate and truthful information and documents requested by the Agent, respond promptly to requests, maintain communication, and pay agreed fees in accordance with Section 3.', is_mandatory: true },
  { clause_key: 'confidentiality', title: 'Confidentiality', order_index: 8, content: 'Each party will keep confidential all information received from the other party except where disclosure is required by law or authorised in writing. Confidentiality obligations survive termination of this Agreement.', is_mandatory: false },
  { clause_key: 'termination', title: 'Termination', order_index: 9, content: 'Either party may terminate this Agreement by written notice. Upon termination, the Client remains liable for fees relating to work already performed. Termination does not affect accrued rights or obligations.', is_mandatory: false },
  { clause_key: 'resolution_of_disputes', title: 'Resolution of Disputes', order_index: 10, content: 'If a dispute arises, the parties will first attempt to resolve the matter in good faith. If unresolved, the Client may refer the matter to the Office of the MARA in accordance with applicable complaints procedures.', is_mandatory: false },
  { clause_key: 'execution', title: 'Execution', order_index: 11, content: 'This Agreement is executed by the parties in accordance with Section 8 (Execution). The Client confirms they have read and understood the terms of this Agreement.', is_mandatory: true },
];

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

async function applyForAgency(admin, agencyId) {
  await admin
    .from('matter_types')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .in('name', LEGACY_NAMES)
    .is('archived_at', null);

  const { data: existing } = await admin.from('matter_types').select('name').eq('agency_id', agencyId);
  const names = new Set((existing || []).map((t) => t.name));
  const toInsert = AVC_TYPES.filter((t) => !names.has(t.name)).map((t) => ({
    agency_id: agencyId,
    name: t.name,
    sort_order: t.sort_order,
    subclass_placeholder: t.subclass_placeholder,
    is_active: true,
  }));
  if (toInsert.length) {
    const { error } = await admin.from('matter_types').insert(toInsert);
    if (error) throw new Error(`matter_types insert ${agencyId}: ${error.message}`);
  }

  const { count } = await admin
    .from('agreement_clauses')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId);
  if (!count) {
    const { error } = await admin.from('agreement_clauses').insert(
      CLAUSES.map((c) => ({
        agency_id: agencyId,
        ...c,
        is_enabled_by_default: true,
      })),
    );
    if (error) throw new Error(`clauses insert ${agencyId}: ${error.message}`);
  }
}

async function main() {
  const env = loadEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: agencies, error } = await admin.from('agencies').select('id, slug');
  if (error) throw error;
  for (const a of agencies || []) {
    await applyForAgency(admin, a.id);
    console.log('Applied for agency', a.slug);
  }
  console.log('PASS: agreement rebuild v2 applied via Supabase API');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
