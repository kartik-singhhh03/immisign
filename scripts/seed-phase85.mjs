/**
 * Phase 8.5 seed: clauses, matter type fields, branding numbering defaults.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CANONICAL_MATTER_TYPES = [
  { name: 'Partner Visa (Onshore/Offshore)', subclass: 'e.g. 820, 801, 309, 100', secondary: true, sponsor: true, dependants: true, fields: [
    { key: 'relationship_status', label: 'Relationship Status', placeholder: 'e.g. De facto, Married' },
    { key: 'relationship_start_date', label: 'Relationship Start Date', type: 'date' },
  ]},
  { name: 'Skilled Migration', subclass: 'e.g. 189, 190, 491', dependants: true, fields: [
    { key: 'nominated_occupation', label: 'Nominated Occupation (ANZSCO)', placeholder: 'e.g. 261313' },
    { key: 'skills_assessment_body', label: 'Skills Assessment Body', placeholder: 'e.g. ACS, VETASSESS' },
  ]},
  { name: 'Employer Sponsored', subclass: 'e.g. 482, 186, 494', sponsor: true, dependants: true, fields: [
    { key: 'employer_name', label: 'Sponsoring Employer', placeholder: 'Legal entity name' },
    { key: 'nominated_position', label: 'Nominated Position', placeholder: 'Job title' },
  ]},
  { name: 'Parent Visa', subclass: 'e.g. 143, 864, 804', sponsor: true, fields: [
    { key: 'parent_applicant_name', label: 'Parent Applicant Name' },
    { key: 'balance_of_family_details', label: 'Balance of Family Test Details', type: 'textarea', col_span: 2 },
  ]},
  { name: 'Student Visa', subclass: 'e.g. 500, 590', dependants: true, fields: [
    { key: 'institution_name', label: 'Education Provider / Institution' },
    { key: 'course_name', label: 'Course Name' },
    { key: 'coe_number', label: 'CoE / Confirmation Number', placeholder: 'e.g. CoE123456' },
  ]},
  { name: 'Visitor Visa', subclass: 'e.g. 600, 651', sponsor: true, fields: [
    { key: 'visit_purpose', label: 'Purpose of Visit', placeholder: 'e.g. Tourism, Family visit' },
    { key: 'intended_stay_duration', label: 'Intended Stay Duration', placeholder: 'e.g. 3 months' },
  ]},
  { name: 'Bridging Visa', subclass: 'e.g. 010, 050, BVA', fields: [
    { key: 'substantive_visa_held', label: 'Substantive Visa Held / Applied For' },
    { key: 'bridging_grounds', label: 'Bridging Grounds', type: 'textarea', col_span: 2 },
  ]},
  { name: 'Aged Dependent Relative', subclass: 'e.g. 838, 114', sponsor: true, fields: [
    { key: 'sponsor_relationship', label: 'Sponsor Relationship to Applicant', placeholder: 'e.g. Sibling, Parent' },
  ]},
  { name: 'ART Appeal / Merits Review', subclass: 'e.g. ART review', fields: [
    { key: 'art_application_number', label: 'ART / Tribunal Application Number' },
    { key: 'decision_date', label: 'Original Decision Date', type: 'date' },
    { key: 'appeal_grounds_summary', label: 'Appeal Grounds Summary', type: 'textarea', col_span: 2 },
  ]},
  { name: 'Character / Health Waiver', subclass: 'e.g. s501, PIC 4007', fields: [
    { key: 'waiver_type', label: 'Waiver Type', placeholder: 'Character / Health / Both' },
    { key: 'waiver_grounds_summary', label: 'Waiver Grounds Summary', type: 'textarea', col_span: 2 },
  ]},
];

const STANDARD_CLAUSES = [
  { key: 'appointment_of_agent', title: 'Appointment of Agent', order: 4, content: 'The Client appoints the Agent as their registered migration agent to act on their behalf in relation to the matter described in Section 1. The Agent is authorised to provide immigration assistance in accordance with the Migration Act 1958 (Cth) and the MARA Code of Conduct.' },
  { key: 'email_protocol', title: 'Email Protocol', order: 5, content: 'Communication between the Client and the Agent will occur primarily via email unless otherwise agreed in writing.\nThe Client must maintain a valid and accessible email address and promptly notify the Agent of any change to contact details.\nThe Client is responsible for monitoring their email inbox and responding to requests within reasonable timeframes.' },
  { key: 'agent_obligations', title: 'Agent Obligations', order: 6, content: 'The Agent will provide services with reasonable skill, care and diligence and in accordance with the MARA Code of Conduct.\nThe Agent will act honestly, fairly and in the best interests of the Client within the scope of the agreed services.\nThe Agent does not guarantee any particular visa outcome, processing time or decision by the Department of Home Affairs or any other authority.' },
  { key: 'client_obligations', title: 'Client Obligations', order: 7, content: 'The Client must provide complete, accurate and truthful information and documents requested by the Agent.\nThe Client must respond promptly to requests for information, evidence or instructions.\nThe Client must maintain communication with the Agent and inform the Agent of any material change in circumstances.\nThe Client must pay agreed fees and disbursements in accordance with the agreed payment schedule.' },
  { key: 'fees', title: 'Fees', order: 8, content: 'The Client agrees to pay the professional fees and estimated disbursements set out in Section 3.\nInvoices are payable in accordance with the agreed payment schedule unless otherwise stated in writing.\nLate payment may result in suspension of services, recovery action, and interest charges permitted by law.\nDisbursements paid to third parties on the Client\'s behalf are generally non-refundable once incurred.' },
  { key: 'termination', title: 'Termination', order: 9, content: 'Either party may terminate this Agreement by written notice to the other party.\nUpon termination, the Client remains liable for fees and disbursements relating to work already performed up to the date of termination.\nTermination does not affect accrued rights or obligations of either party.' },
  { key: 'retention_of_documents', title: 'Retention of Documents', order: 10, content: 'The Agent will retain client files and records in accordance with applicable legal and professional requirements.\nThe Client may request copies of documents held on their file, subject to reasonable administrative charges where applicable.' },
  { key: 'refunds', title: 'Refunds', order: 11, content: 'Refunds, if any, are assessed based on work completed, costs incurred, and the agreed payment schedule at the date of termination.\nFees relating to completed work and non-recoverable third-party disbursements are not refundable.' },
  { key: 'confidentiality', title: 'Confidentiality', order: 12, content: 'Each party will keep confidential all information received from the other party except where disclosure is required by law or authorised in writing.\nConfidentiality obligations survive termination of this Agreement.' },
  { key: 'dispute_resolution', title: 'Dispute Resolution', order: 13, content: 'If a dispute arises, the parties will first attempt to resolve the matter in good faith through direct discussion.\nIf unresolved, the Client may refer the matter to the Office of the MARA in accordance with applicable complaints procedures.' },
  { key: 'variation', title: 'Variation', order: 14, content: 'Any variation to this Agreement must be in writing and signed or otherwise agreed by both parties.\nVerbal instructions do not amend the written terms of this Agreement unless confirmed in writing.' },
  { key: 'governing_law', title: 'Governing Law', order: 15, content: 'This Agreement is governed by the laws of the Commonwealth of Australia and, where applicable, the laws of the State or Territory in which the Agent primarily conducts business.\nThe parties submit to the non-exclusive jurisdiction of the courts of Australia.' },
  { key: 'consumer_guide', title: 'Consumer Guide', order: 16, content: 'The Client acknowledges receipt of the Consumer Guide published by the Office of the MARA and available at https://www.mara.gov.au/.' },
];

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: agencies } = await supabase.from('agencies').select('id, slug');
for (const agency of agencies || []) {
  const prefix = (agency.slug || 'AGR').split('-').map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 3).toUpperCase() || 'AGR';

  await supabase.from('branding_settings').upsert({
    agency_id: agency.id,
    agreement_ref_prefix: prefix,
    agreement_ref_start: 1001,
    agreement_header_title: 'Migration Agent Service Agreement',
    agreement_footer_text: 'This document was prepared by a Registered Migration Agent bound by the MARA Code of Conduct.',
  }, { onConflict: 'agency_id' });

  const { count: clauseCount } = await supabase.from('agreement_clauses').select('*', { count: 'exact', head: true }).eq('agency_id', agency.id);
  if (!clauseCount) {
    await supabase.from('agreement_clauses').insert(
      STANDARD_CLAUSES.map((c) => ({
        agency_id: agency.id,
        clause_key: c.key,
        title: c.title,
        content: c.content,
        order_index: c.order,
        is_mandatory: false,
        is_enabled_by_default: true,
      }))
    );
  }

  for (const [idx, mt] of CANONICAL_MATTER_TYPES.entries()) {
    let { data: row } = await supabase.from('matter_types').select('id').eq('agency_id', agency.id).eq('name', mt.name).maybeSingle();
    if (!row) {
      const { data: inserted } = await supabase.from('matter_types').insert({
        agency_id: agency.id,
        name: mt.name,
        sort_order: idx + 1,
        subclass_placeholder: mt.subclass,
        show_secondary_applicant: Boolean(mt.secondary),
        show_sponsor: Boolean(mt.sponsor),
        show_dependants: Boolean(mt.dependants),
      }).select('id').single();
      row = inserted;
    } else {
      await supabase.from('matter_types').update({
        subclass_placeholder: mt.subclass,
        show_secondary_applicant: Boolean(mt.secondary),
        show_sponsor: Boolean(mt.sponsor),
        show_dependants: Boolean(mt.dependants),
      }).eq('id', row.id);
    }
    if (!row?.id) continue;

    const { count: fieldCount } = await supabase.from('matter_type_fields').select('*', { count: 'exact', head: true }).eq('matter_type_id', row.id);
    if (!fieldCount && mt.fields?.length) {
      await supabase.from('matter_type_fields').insert(
        mt.fields.map((f, fidx) => ({
          matter_type_id: row.id,
          field_key: f.key,
          label: f.label,
          field_type: f.type || 'text',
          required: false,
          placeholder: f.placeholder || null,
          col_span: f.col_span || 1,
          sort_order: fidx + 1,
        }))
      );
    }
  }
}

console.log('PHASE85_SEED_OK', { agencies: agencies?.length });
