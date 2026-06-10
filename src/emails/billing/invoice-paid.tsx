import * as React from 'react';
import { Section, Text, Heading } from '@react-email/components';
import { BaseLayout } from '../layouts/base-layout';
import { PrimaryCTA } from '../components/button';
import { APP_NAME } from '@/lib/brand';

interface InvoicePaidEmailProps {
  agencyName: string;
  amount: string;
  invoiceUrl: string;
  date: string;
  planName: string;
}

export const InvoicePaidEmail = ({
  agencyName = 'Your Agency',
  amount = '$149.00',
  invoiceUrl = 'https://app.immimate.com/dashboard/billing',
  date = new Date().toLocaleDateString(),
  planName = 'Pro Plan',
}: InvoicePaidEmailProps) => {
  return (
    <BaseLayout 
        previewText={`Your ${agencyName} receipt for ${amount}`}
        branding={{ name: `${APP_NAME} Billing` }}
    >
      <Heading className="text-black text-[22px] font-semibold text-center mb-6">
        Payment Receipt
      </Heading>
      
      <Text className="text-black text-[15px] leading-[24px]">
        Hi {agencyName} Team,
      </Text>
      
      <Text className="text-black text-[15px] leading-[24px]">
        Thanks for using {APP_NAME}. This email verifies your recent subscription payment was successful. 
        Your {planName} limits are instantly replenished for the cycle.
      </Text>
      
      <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-md p-6 my-6 text-center">
         <Text className="text-[14px] text-slate-500 font-semibold m-0 mb-2">
            Amount Paid
         </Text>
         <Text className="text-[28px] text-slate-800 m-0 mb-6 font-bold">
             {amount}
         </Text>
         <PrimaryCTA href={invoiceUrl}>
            Download Official Invoice
         </PrimaryCTA>
      </Section>

      <Text className="text-slate-600 text-[14px] leading-[24px]">
        Official tax receipts can always be retrieved from your workspace billing portal.
      </Text>
    </BaseLayout>
  );
};

export default InvoicePaidEmail;
