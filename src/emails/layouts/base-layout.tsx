import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link
} from '@react-email/components';
import * as React from 'react';
import { AgencyBranding } from '@/lib/email/client';
import { APP_NAME } from '@/lib/brand';

export interface BaseLayoutProps {
  previewText?: string;
  branding?: any;
  children: React.ReactNode;
}

export const BaseLayout = ({ previewText, branding, children }: BaseLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText || ""}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Tenant Sub-Header Block */}
          <Section style={headerStyle}>
            {branding.logoUrl ? (
              <Img src={branding.logoUrl} alt={branding.name} height={40} style={logoStyle} />
            ) : (
              <Text style={{ ...logoTextStyle, color: branding.primaryColor }}>{branding.name}</Text>
            )}
          </Section>
          
          {/* Main Body Wrapped */}
          <Section style={contentStyle}>
            {children}
          </Section>

          <Hr style={dividerStyle} />
          
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              This communication securely originated via {APP_NAME} on behalf of {branding.name}.
              Ensure due diligence verifying URLs inside legal frameworks.
            </Text>
            <Text style={footerTextStyle}>
              Powered by {APP_NAME}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const mainStyle = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const containerStyle = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
};

const headerStyle = {
  padding: '32px 48px',
  textAlign: 'center' as const,
};

const logoStyle = {
  margin: '0 auto',
};

const logoTextStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0',
};

const contentStyle = {
  padding: '0 48px',
  marginBottom: '24px',
};

const dividerStyle = {
  borderTop: '1px solid #e2e8f0',
  margin: '20px 48px',
};

const footerStyle = {
  padding: '0 48px',
  textAlign: 'center' as const,
};

const footerTextStyle = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
};

const footerLinkStyle = {
  color: '#64748b',
  textDecoration: 'underline',
};

export default BaseLayout;
