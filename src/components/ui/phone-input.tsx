'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { sanitizePhoneInput } from '@/lib/validations/fields';
import { cn } from '@/lib/utils';

export type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'onChange'
> & {
  value: string;
  onChange: (value: string) => void;
};

/** Phone field: blocks letters/symbols except + ( ) - . and space */
export function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      pattern="[0-9+()\\s.-]*"
      value={value}
      onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
      className={cn(className)}
      {...props}
    />
  );
}
