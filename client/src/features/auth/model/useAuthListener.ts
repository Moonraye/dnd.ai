'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { getSession, onAuthStateChange } from '../api/authApi';

/**
 * Hydrates the auth store from the current Supabase session and keeps it in
 * sync with token refreshes, sign-ins and sign-outs. Mount once app-wide.
 */
export function useAuthListener(): void {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });

    const unsubscribe = onAuthStateChange(setSession);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setSession]);
}
