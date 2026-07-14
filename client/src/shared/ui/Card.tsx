import { type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** Elevated surface — dialogs, feature cards, campaign cards. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-raised shadow-[var(--shadow-md)]',
        className,
      )}
      {...props}
    />
  );
}

/** Standard bordered panel — the repeated in-game panel container. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-md border border-border bg-surface p-4', className)}
      {...props}
    />
  );
}
