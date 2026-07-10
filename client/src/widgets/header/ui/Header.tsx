'use client';

import Link from 'next/link';
import { SignOutButton } from '@/features/auth';
import { useAuthStore } from '@/shared/store/authStore';

export function Header() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="text-lg font-bold">
        DunDrAI
      </Link>

      {status === 'loading' ? (
        <span
          data-testid="auth-loading"
          className="h-8 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
        />
      ) : status === 'authenticated' && user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {(user.user_metadata?.username as string | undefined) ?? user.email}
          </span>
          <SignOutButton />
        </div>
      ) : (
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}
