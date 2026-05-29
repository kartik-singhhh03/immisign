import {
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "../layouts/base-layout";

interface SubscriptionUpdatedEmailProps {
  name: string;
  planName: string;
  billingPortalUrl: string;
  agencyBranding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

export const SubscriptionUpdatedEmail = ({
  name,
  planName,
  billingPortalUrl,
  agencyBranding,
}: SubscriptionUpdatedEmailProps) => {
  const primaryColor = agencyBranding?.primary_color || "#2563eb";

  return (
    <BaseLayout branding={agencyBranding}>
      <Section className="px-6 py-8">
        <Heading className="text-2xl font-semibold text-gray-900 mb-6 font-sans">
          Subscription Updated
        </Heading>
        <Text className="text-base text-gray-700 leading-6 mb-6 font-sans">
          Hi {name},
        </Text>
        <Text className="text-base text-gray-700 leading-6 mb-8 font-sans">
          Your subscription has been successfully updated to the <strong>{planName}</strong> plan. 
          You now have access to all the features and capabilities included in your new tier.
        </Text>
        <Section className="text-center">
          <Link
            href={billingPortalUrl}
            className="inline-block px-6 py-3 rounded-lg text-white font-medium text-center no-underline font-sans"
            style={{ backgroundColor: primaryColor }}
          >
            Manage Billing
          </Link>
        </Section>
        <Text className="text-sm text-gray-500 mt-8 mb-0 font-sans">
          You can view your current plan details and invoices at any time from your billing portal.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default SubscriptionUpdatedEmail;
