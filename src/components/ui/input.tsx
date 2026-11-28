import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-[#5b6870] transition-colors focus-visible:border-[#176b4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b4d]/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:ring-rose-600/20',
        className,
      )}
      {...props}
    />
  );
}
