'use client';

import { Button } from '@/shared/ui';
import { useSignOut } from '../model/useSignOut';

export function SignOutButton() {
  const { signOut, isSigningOut } = useSignOut();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void signOut()}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
