'use client';

import { useSignOut } from '../model/useSignOut';

export function SignOutButton() {
  const { signOut, isSigningOut } = useSignOut();

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={isSigningOut}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
