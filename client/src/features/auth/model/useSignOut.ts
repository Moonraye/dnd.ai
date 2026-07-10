'use client';

import { useCallback, useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { signOut } from '../api/authApi';

export function useSignOut() {
  const setSession = useAuthStore((state) => state.setSession);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setSession(null);
    } finally {
      setIsSigningOut(false);
    }
  }, [setSession]);

  return { signOut: handleSignOut, isSigningOut };
}
