'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { signIn } from '../api/authApi';
import { SignInSchema, type SignInInput } from './schemas';
import { useAuthForm } from './useAuthForm';

export function useSignIn() {
  const setSession = useAuthStore((state) => state.setSession);

  const action = useCallback(
    async (input: SignInInput) => {
      const session = await signIn(input);
      setSession(session);
    },
    [setSession],
  );

  return useAuthForm(SignInSchema, action);
}
