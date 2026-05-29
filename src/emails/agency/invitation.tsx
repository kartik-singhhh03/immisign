import {
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "../layouts/base-layout";

interface InvitationEmailProps {
  name: string;
  inviterName: string;
  agencyName: string;
  inviteUrl: string;
  role: string;
  agencyBranding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

export const InvitationEmail = ({
  name,
  inviterName,
  agencyName,
  inviteUrl,
  role,
  agencyBranding,
}: InvitationEmailProps) => {
  const primaryColor = agencyBranding?.primary_color || "#2563eb";

  return (
    <BaseLayout branding={agencyBranding}>
      <Section className="px-6 py-8">
        <Heading className="text-2xl font-semibold text-gray-900 mb-6 font-sans">
          You've been invited to join {agencyName}
        </Heading>
        <Text className="text-base text-gray-700 leading-6 mb-6 font-sans">
          Hi {name},
        </Text>
        <Text className="text-base text-gray-700 leading-6 mb-8 font-sans">
          {inviterName} has invited you to join their workspace on ImmiSign as a <strong>{role}</strong>. 
          Get seamless access to your portal by accepting this invitation below.
        </Text>
        <Section className="text-center">
          <Link
            href={inviteUrl}
            className="inline-block px-6 py-3 rounded-lg text-white font-medium text-center no-underline font-sans"
            style={{ backgroundColor: primaryColor }}
          >
            Accept Invitation
          </Link>
        </Section>
        <Text className="text-sm text-gray-500 mt-8 mb-0 font-sans">
          If you don't know {inviterName}, or aren't expecting this invitation, you can ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default InvitationEmail;
