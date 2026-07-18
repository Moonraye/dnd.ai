'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { signUp } from '../api/authApi';
import { SignUpSchema, type SignUpInput } from './schemas';
import { useAuthForm } from './useAuthForm';

export function useSignUp() {
  const setSession = useAuthStore((state) => state.setSession);

  const action = useCallback(
    async (input: SignUpInput) => {
      const session = await signUp(input);
      // Session is null when email confirmation is pending.
      if (session) setSession(session);
    },
    [setSession],
  );

  return useAuthForm(SignUpSchema, action);
}
