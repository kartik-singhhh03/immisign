import { Button, Text, Section } from '@react-email/components';
import * as React from 'react';
import BaseLayout from '../layouts/base-layout';
import { AgencyBranding } from '@/lib/email/client';

interface AgreementSentEmailProps {
  branding: AgencyBranding;
  payload: {
    signerName: string;
    agreementTitle: string;
    actionUrl: string;
    expiresAt?: string;
    agentName?: string;
  };
}

export const AgreementSentEmail = ({ branding, payload }: AgreementSentEmailProps) => {
  return (
    <BaseLayout 
      previewText={`Signature requested by ${branding.name}`}
      branding={branding}
    >
      <Text style={greetingStyle}>
        Hi {payload.signerName},
      </Text>
      <Text style={paragraphStyle}>
        <strong>{payload.agentName || branding.name}</strong> has requested your signature on the following agreement:
      </Text>
      
      <Section style={documentBoxStyle}>
        <Text style={documentTitleStyle}>{payload.agreementTitle}</Text>
      </Section>

      <Text style={paragraphStyle}>
        Please review and sign the document securely via our portal.
        {payload.expiresAt && ` This request will automatically expire on ${payload.expiresAt}.`}
      </Text>

      <Section style={btnContainerStyle}>
        <Button 
          href={payload.actionUrl} 
          style={{ ...btnStyle, backgroundColor: branding.primaryColor }}
        >
          Review & Sign Securely
        </Button>
      </Section>

      <Text style={disclaimerStyle}>
        If you have any questions about this document, please reply directly to this email to contact your migration agent.
      </Text>
    </BaseLayout>
  );
};

const greetingStyle = {
  fontSize: '18px',
  color: '#334155',
  fontWeight: '600',
  marginBottom: '16px',
};

const paragraphStyle = {
  fontSize: '16px',
  color: '#475569',
  lineHeight: '24px',
};

const documentBoxStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const documentTitleStyle = {
  fontSize: '16px',
  color: '#0f172a',
  fontWeight: '500',
  margin: 0,
};

const btnContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const btnStyle = {
  padding: '14px 28px',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
};

const disclaimerStyle = {
  fontSize: '14px',
  color: '#94a3b8',
  lineHeight: '20px',
  marginTop: '32px',
};

export default AgreementSentEmail;
