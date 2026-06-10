import { AgreementsList } from '@/features/agreements/components/list/agreements-list';

export default function AgreementsPage({ params }: { params: { agency: string } }) {
  return <AgreementsList agencySlug={params.agency} />;
}
