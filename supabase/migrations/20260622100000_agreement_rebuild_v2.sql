-- Agreement rebuild v2: AVC matter types, standard clauses seed, backward compatible

-- Archive legacy visa-stream matter types (Partner Visa, Student Visa, etc.)
UPDATE public.matter_types
SET
  is_active = false,
  archived_at = COALESCE(archived_at, NOW())
WHERE name IN (
  'Partner Visa (Onshore/Offshore)',
  'Skilled Migration',
  'Employer Sponsored',
  'Parent Visa',
  'Student Visa',
  'Visitor Visa',
  'Bridging Visa',
  'Aged Dependent Relative',
  'ART Appeal / Merits Review',
  'Character / Health Waiver'
)
AND archived_at IS NULL;

-- AVC matter type categories (Visa Application, ART Appeal, etc.)
INSERT INTO public.matter_types (agency_id, name, sort_order, subclass_placeholder, is_active)
SELECT a.id, v.name, v.sort_order, v.subclass_placeholder, true
FROM public.agencies a
CROSS JOIN (
  VALUES
    ('Visa Application', 1, 'e.g. 820, 804, 482'),
    ('ART Appeal', 2, 'e.g. ART review reference'),
    ('Skill Assessment', 3, 'e.g. ACS, VETASSESS'),
    ('PSA', 4, 'Professional Services Agreement'),
    ('JRP', 5, 'Job Ready Program')
) AS v(name, sort_order, subclass_placeholder)
WHERE NOT EXISTS (
  SELECT 1 FROM public.matter_types mt
  WHERE mt.agency_id = a.id AND mt.name = v.name
);

-- Seed standard AVC agreement clauses for agencies missing any clauses
INSERT INTO public.agreement_clauses (
  agency_id,
  clause_key,
  title,
  content,
  order_index,
  is_mandatory,
  is_enabled_by_default
)
SELECT
  a.id,
  v.clause_key,
  v.title,
  v.content,
  v.order_index,
  v.is_mandatory,
  true
FROM public.agencies a
CROSS JOIN (
  VALUES
    ('appointment_of_agent', 'Appointment of Agent', 4, 'The Client appoints the Agent as their registered migration agent to act on their behalf in relation to the matter described in Section 1. The Agent is authorised to provide immigration assistance in accordance with the Migration Act 1958 (Cth) and the MARA Code of Conduct.', true),
    ('code_of_conduct', 'Code of Conduct', 5, 'The Agent will act in accordance with the Registered Migration Agent Code of Conduct (March 2022). The Client acknowledges that a copy of the Code of Conduct is available from the Office of the Migration Agents Registration Authority at www.mara.gov.au.', true),
    ('services_to_be_provided', 'Services to be Provided', 6, 'The services to be provided by the Agent are set out in Section 2 (Scope of Work) of this Agreement. The Agent will provide those services with reasonable skill, care and diligence.', true),
    ('client_agrees', 'Client Agrees', 7, 'The Client agrees to provide complete, accurate and truthful information and documents requested by the Agent, respond promptly to requests, maintain communication, and pay agreed fees in accordance with Section 3.', true),
    ('confidentiality', 'Confidentiality', 8, 'Each party will keep confidential all information received from the other party except where disclosure is required by law or authorised in writing. Confidentiality obligations survive termination of this Agreement.', false),
    ('termination', 'Termination', 9, 'Either party may terminate this Agreement by written notice. Upon termination, the Client remains liable for fees relating to work already performed. Termination does not affect accrued rights or obligations.', false),
    ('resolution_of_disputes', 'Resolution of Disputes', 10, 'If a dispute arises, the parties will first attempt to resolve the matter in good faith. If unresolved, the Client may refer the matter to the Office of the MARA in accordance with applicable complaints procedures.', false),
    ('execution', 'Execution', 11, 'This Agreement is executed by the parties in accordance with Section 8 (Execution). The Client confirms they have read and understood the terms of this Agreement.', true)
) AS v(clause_key, title, order_index, content, is_mandatory)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agreement_clauses ac WHERE ac.agency_id = a.id
);
