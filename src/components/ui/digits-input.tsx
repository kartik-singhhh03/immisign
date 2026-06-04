'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeDigitsInput } from '@/lib/validations/fields';
import { cn } from '@/lib/utils';

export type DigitsInputProps = Omit<React.ComponentProps<typeof Input>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  maxDigits: number;
  inputMode?: 'numeric';
};

/** Numeric-only input (MARN 7, ABN 11, etc.) */
export function DigitsInput({
  value,
  onChange,
  maxDigits,
  className,
  inputMode = 'numeric',
  ...props
}: DigitsInputProps) {
  return (
    <Input
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(sanitizeDigitsInput(e.target.value, maxDigits))}
      className={cn(className)}
      {...props}
    />
  );
}
