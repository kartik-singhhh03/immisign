/** AVC migration-agreement baseline — multi-tenant safe defaults. */

export const AVC_MATTER_TYPES = [
  { name: 'Visa Application', sortOrder: 1, subclassPlaceholder: 'e.g. 820, 804, 482' },
  { name: 'ART Appeal', sortOrder: 2, subclassPlaceholder: 'e.g. ART review' },
  { name: 'Skill Assessment', sortOrder: 3, subclassPlaceholder: 'e.g. ACS, VETASSESS' },
  { name: 'PSA', sortOrder: 4, subclassPlaceholder: 'Professional Services Agreement' },
  { name: 'JRP', sortOrder: 5, subclassPlaceholder: 'Job Ready Program' },
] as const

export const GOVERNMENT_FEE_LABELS = [
  { key: 'first_vac', label: 'First VAC' },
  { key: 'second_vac', label: 'Second VAC' },
  { key: 'additional_vac', label: 'Additional VAC' },
] as const

export type GovernmentFeeKey = (typeof GOVERNMENT_FEE_LABELS)[number]['key']

export const AVC_STANDARD_CLAUSES = [
  {
    key: 'appointment_of_agent',
    title: 'Appointment of Agent',
    order: 4,
    mandatory: true,
    content:
      'The Client appoints the Agent as their registered migration agent to act on their behalf in relation to the matter described in Section 1. The Agent is authorised to provide immigration assistance in accordance with the Migration Act 1958 (Cth) and the MARA Code of Conduct.',
  },
  {
    key: 'code_of_conduct',
    title: 'Code of Conduct',
    order: 5,
    mandatory: true,
    content:
      'The Agent will act in accordance with the Registered Migration Agent Code of Conduct (March 2022). The Client acknowledges that a copy of the Code of Conduct is available from the Office of the Migration Agents Registration Authority at www.mara.gov.au.',
  },
  {
    key: 'services_to_be_provided',
    title: 'Services to be Provided',
    order: 6,
    mandatory: true,
    content:
      'The services to be provided by the Agent are set out in Section 2 (Scope of Work) of this Agreement. The Agent will provide those services with reasonable skill, care and diligence.',
  },
  {
    key: 'client_agrees',
    title: 'Client Agrees',
    order: 7,
    mandatory: true,
    content:
      'The Client agrees to provide complete, accurate and truthful information and documents requested by the Agent, respond promptly to requests, maintain communication, and pay agreed fees in accordance with Section 3.',
  },
  {
    key: 'confidentiality',
    title: 'Confidentiality',
    order: 8,
    mandatory: false,
    content:
      'Each party will keep confidential all information received from the other party except where disclosure is required by law or authorised in writing. Confidentiality obligations survive termination of this Agreement.',
  },
  {
    key: 'termination',
    title: 'Termination',
    order: 9,
    mandatory: false,
    content:
      'Either party may terminate this Agreement by written notice. Upon termination, the Client remains liable for fees relating to work already performed. Termination does not affect accrued rights or obligations.',
  },
  {
    key: 'resolution_of_disputes',
    title: 'Resolution of Disputes',
    order: 10,
    mandatory: false,
    content:
      'If a dispute arises, the parties will first attempt to resolve the matter in good faith. If unresolved, the Client may refer the matter to the Office of the MARA in accordance with applicable complaints procedures.',
  },
  {
    key: 'execution',
    title: 'Execution',
    order: 11,
    mandatory: true,
    content:
      'This Agreement is executed by the parties in accordance with Section 8 (Execution). The Client confirms they have read and understood the terms of this Agreement.',
  },
] as const
