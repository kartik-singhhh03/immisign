import {
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "../layouts/base-layout";

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  agencyBranding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

export const PasswordResetEmail = ({
  name,
  resetUrl,
  agencyBranding,
}: PasswordResetEmailProps) => {
  const primaryColor = agencyBranding?.primary_color || "#2563eb";

  return (
    <BaseLayout branding={agencyBranding}>
      <Section className="px-6 py-8">
        <Heading className="text-2xl font-semibold text-gray-900 mb-6 font-sans">
          Reset Your Password
        </Heading>
        <Text className="text-base text-gray-700 leading-6 mb-6 font-sans">
          Hi {name},
        </Text>
        <Text className="text-base text-gray-700 leading-6 mb-8 font-sans">
          We received a request to reset your password. If you didn't make this 
          request, you can safely ignore this email. Otherwise, click the button 
          below to set a new password.
        </Text>
        <Section className="text-center">
          <Link
            href={resetUrl}
            className="inline-block px-6 py-3 rounded-lg text-white font-medium text-center no-underline font-sans"
            style={{ backgroundColor: primaryColor }}
          >
            Reset Password
          </Link>
        </Section>
        <Text className="text-sm text-gray-500 mt-8 mb-0 font-sans">
          For security reasons, this link will expire in 1 hour.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default PasswordResetEmail;
