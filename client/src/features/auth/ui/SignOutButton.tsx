'use client';

import { useTranslation } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useSignOut } from '../model/useSignOut';

export function SignOutButton() {
  const { t } = useTranslation();
  const { signOut, isSigningOut } = useSignOut();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void signOut()}
      disabled={isSigningOut}
    >
      {isSigningOut ? t.common.signingOut : t.common.signOut}
    </Button>
  );
}
