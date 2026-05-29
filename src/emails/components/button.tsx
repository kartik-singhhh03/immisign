import { Button as ReactEmailButton } from '@react-email/components';
import * as React from 'react';

interface PrimaryCTAProps {
  href: string;
  children: React.ReactNode;
}

export const PrimaryCTA = ({ href, children }: PrimaryCTAProps) => {
  return (
    <ReactEmailButton
      className="bg-[#0f172a] rounded text-white text-[14px] font-semibold no-underline text-center px-6 py-3 block w-max"
      href={href}
    >
      {children}
    </ReactEmailButton>
  );
};
