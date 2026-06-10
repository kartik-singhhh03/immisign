import * as React from 'react'
import { cn } from '@/lib/utils'

export function ImmiMateCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#E7E7E7] bg-white p-5 shadow-[0_1px_3px_rgba(17,17,17,0.06)]',
        'transition-[border-color,box-shadow] duration-200 ease-out',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
