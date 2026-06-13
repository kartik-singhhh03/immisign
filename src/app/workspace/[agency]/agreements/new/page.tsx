import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AgreementWizard } from '@/features/agreements/components/wizard/agreement-wizard';
import { formatResponsibleAgentRole, RESPONSIBLE_AGENT_ROLES } from '@/features/agreements/constants/matter-field-config';
import type { AgencyWizardContext, RmaOption, UserWizardContext } from '@/features/agreements/types/wizard';
import { loadAgencySettings } from '@/lib/settings/load-agency-settings';
import type { AgencySettings } from '@/lib/settings/types';

export default async function NewAgreementPage({
  params,
  searchParams,
}: {
  params: { agency: string };
  searchParams?: { clientId?: string; resume?: string };
}) {
  const adminClient = createAdminClient();

  const { data: agency, error } = await (adminClient as any)
    .from('agencies')
    .select('id, slug, name, legal_name, principal_name, address, abn, phone, email, website, marn')
    .eq('slug', params.agency)
    .single();

  if (error || !agency) {
    console.error('Error looking up agency:', error);
    return notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return notFound();

  const { data: profile } = await (supabase as any)
    .from('users')
    .select('id, full_name, email, role, agency_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.agency_id !== agency.id) return notFound();

  const agencySettings: AgencySettings = await loadAgencySettings(adminClient as any, agency.id);

  const { data: rmaRecords } = await (adminClient as any)
    .from('rmas')
    .select('user_id, mara_number, is_default, rma_status, users(full_name, email, role)')
    .eq('agency_id', agency.id)
    .eq('rma_status', 'active');

  const activeRmas = (rmaRecords || []).filter((r: any) => r.users);
  const rmaOptions: RmaOption[] = activeRmas.map((r: any) => ({
    id: r.user_id,
    name: `${r.users.full_name} (${formatResponsibleAgentRole(r.users.role || 'agent')})`,
    email: r.users.email,
    marn: r.mara_number,
    role: r.users.role,
    isDefault: Boolean(r.is_default),
  }));

  if (rmaOptions.length === 0) {
    const { data: teamMembers } = await (adminClient as any)
      .from('users')
      .select('id, full_name, email, role')
      .eq('agency_id', agency.id)
      .in('role', [...RESPONSIBLE_AGENT_ROLES])
      .order('full_name');

    for (const member of teamMembers || []) {
      rmaOptions.push({
        id: member.id,
        name: `${member.full_name} (${formatResponsibleAgentRole(member.role)})`,
        email: member.email,
        role: member.role,
        isDefault: member.id === user.id,
      });
    }
  }

  if (rmaOptions.length === 0) {
    rmaOptions.push({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
      isDefault: true,
    });
  }

  const defaultRma = rmaOptions.find((r) => r.isDefault) || rmaOptions[0];
  const agencyContext: AgencyWizardContext = {
    id: agency.id,
    name: agencySettings.agency.name || agency.name,
    slug: agency.slug,
    legalName: agencySettings.agency.legalName || agency.legal_name || agency.name,
    principalName: agencySettings.agency.principalName || defaultRma?.name,
    address: agencySettings.agency.address,
    abn: agencySettings.agency.abn,
    phone: agencySettings.agency.phone,
    email: agencySettings.agency.email,
    marn: agencySettings.agency.marn || defaultRma?.marn,
    branding: agencySettings.branding,
  };

  const userContext: UserWizardContext = {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    marn: defaultRma?.marn,
  };

  const { data: clientRows } = await (adminClient as any)
    .from('clients')
    .select('id, name, email, phone')
    .eq('agency_id', agency.id)
    .order('name');

  const initialClientId =
    searchParams?.clientId &&
    (clientRows || []).some((c: { id: string }) => c.id === searchParams.clientId)
      ? searchParams.clientId
      : undefined;

  return (
    <AgreementWizard
      agencyId={agency.id}
      agencySlug={agency.slug}
      userId={user.id}
      agency={agencyContext}
      user={userContext}
      rmaOptions={rmaOptions}
      agencySettings={agencySettings}
      initialClientId={initialClientId}
      resumeDraft={searchParams?.resume === '1'}
      clients={(clientRows || []).map((c: { id: string; name: string; email: string; phone?: string }) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      }))}
    />
  );
}
