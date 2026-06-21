import type { AgreementWizardFormData } from '../types/wizard';
import { composeClientFullName } from '../types/wizard';

export type WizardSigner = {
  role: string;
  signwellRole: string;
  name: string;
  email: string;
  routing_order: number;
};

function pushSigner(
  list: WizardSigner[],
  seen: Set<string>,
  entry: Omit<WizardSigner, 'routing_order'> & { routing_order?: number }
) {
  const email = entry.email?.trim().toLowerCase();
  if (!entry.name?.trim() || !email) return;
  if (seen.has(email)) return;
  seen.add(email);
  list.push({
    ...entry,
    name: entry.name.trim(),
    email,
    routing_order: entry.routing_order ?? 1,
  });
}

/** Build SignWell signer list from wizard form data */
export function buildSignersFromWizard(form: AgreementWizardFormData): WizardSigner[] {
  const signers: WizardSigner[] = [];
  const seen = new Set<string>();

  pushSigner(signers, seen, {
    role: 'primary_applicant',
    signwellRole: 'Primary Applicant',
    name: composeClientFullName(form) || form.primaryApplicantName || form.clientName,
    email: form.clientEmail,
    routing_order: 1,
  });

  if (form.secondaryApplicantName?.trim()) {
    pushSigner(signers, seen, {
      role: 'secondary_applicant',
      signwellRole: 'Secondary Applicant',
      name: form.secondaryApplicantName,
      email: form.secondaryApplicantEmail || form.clientEmail,
      routing_order: 1,
    });
  }

  if (form.sponsorName?.trim()) {
    pushSigner(signers, seen, {
      role: 'sponsor',
      signwellRole: 'Sponsor',
      name: form.sponsorName,
      email: form.sponsorEmail || form.clientEmail,
      routing_order: 1,
    });
  }

  const dependants = [
    { name: form.dependant1Name, email: form.dependant1Email },
    { name: form.dependant2Name, email: form.dependant2Email },
    { name: form.dependant3Name, email: form.dependant3Email },
  ];

  dependants.forEach((dep, idx) => {
    if (!dep.name?.trim()) return;
    pushSigner(signers, seen, {
      role: `dependant_${idx + 1}`,
      signwellRole: `Dependant ${idx + 1}`,
      name: dep.name,
      email: dep.email || form.clientEmail,
      routing_order: 1,
    });
  });

  return signers;
}
