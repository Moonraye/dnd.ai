'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

/** Side/bottom sheet built on Radix Dialog — used for mobile session panels. */
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerTitle = DialogPrimitive.Title;

type DrawerSide = 'right' | 'bottom';

type DrawerContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  side?: DrawerSide;
};

export function DrawerContent({
  side = 'right',
  className,
  children,
  ...props
}: DrawerContentProps) {
  const positioning =
    side === 'bottom'
      ? 'bottom-0 inset-x-0 max-h-[85%] rounded-t-xl border-t'
      : 'right-0 top-0 h-full w-80 max-w-[85%] border-l';
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[1300] bg-[var(--color-overlay)]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-[1400] flex flex-col gap-4 overflow-y-auto border-border bg-surface-raised p-4 shadow-[var(--shadow-lg)] focus:outline-none',
          positioning,
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
