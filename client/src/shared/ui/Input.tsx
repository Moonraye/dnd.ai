import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg transition-colors placeholder:text-fg-subtle hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
