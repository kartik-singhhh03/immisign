import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "../layouts/base-layout";
import { APP_NAME } from "@/lib/brand";

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
  agencyBranding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

export const WelcomeEmail = ({
  name,
  loginUrl,
  agencyBranding,
}: WelcomeEmailProps) => {
  const primaryColor = agencyBranding?.primary_color || "#2563eb";

  return (
    <BaseLayout branding={agencyBranding}>
      <Section className="px-6 py-8">
        <Heading className="text-2xl font-semibold text-gray-900 mb-6 font-sans">
          Welcome to {APP_NAME}, {name}!
        </Heading>
        <Text className="text-base text-gray-700 leading-6 mb-6 font-sans">
          We're thrilled to have you on board. {APP_NAME} is your complete operating 
          system for managing immigration workloads securely and efficiently.
        </Text>
        <Text className="text-base text-gray-700 leading-6 mb-8 font-sans">
          You can now login to your portal and complete your onboarding process. 
          If you have any questions, our support team is always here to help.
        </Text>
        <Section className="text-center">
          <Link
            href={loginUrl}
            className="inline-block px-6 py-3 rounded-lg text-white font-medium text-center no-underline font-sans"
            style={{ backgroundColor: primaryColor }}
          >
            Access Your Portal
          </Link>
        </Section>
        <Text className="text-sm text-gray-500 mt-8 mb-0 font-sans">
          If you didn't create an account with {APP_NAME}, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default WelcomeEmail;
