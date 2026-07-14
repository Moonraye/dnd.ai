'use client';

import Link from 'next/link';
import { useSignOut } from '@/features/auth';
import { ThemeToggle } from '@/features/theme';
import { useAuthStore } from '@/shared/store/authStore';
import {
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';

export function Header() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const { signOut, isSigningOut } = useSignOut();

  const displayName =
    (user?.user_metadata?.username as string | undefined) ?? user?.email;

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg/80 px-6 py-4 backdrop-blur">
      <Link
        href="/"
        className="font-display text-xl font-semibold tracking-tight text-fg transition-colors hover:text-primary"
      >
        DunDrAI
      </Link>

      <div className="flex items-center gap-3">
        {status === 'loading' ? (
          <span
            data-testid="auth-loading"
            className="h-9 w-24 animate-pulse rounded-md bg-bg-subtle"
          />
        ) : status === 'authenticated' && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-fg transition-colors hover:border-border-strong">
              <span className="max-w-[12rem] truncate">{displayName}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event: Event) => {
                  event.preventDefault();
                  void signOut();
                }}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              Sign up
            </Link>
          </nav>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
