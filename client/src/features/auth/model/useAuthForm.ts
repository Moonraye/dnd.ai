'use client';

import { useCallback, useState } from 'react';
import type { ZodType } from 'zod';

export interface AuthFormState {
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

/**
 * Shared submit-state machine for auth forms: validates raw input with a Zod
 * schema, runs the submit action, and exposes field/global errors.
 */
export function useAuthForm<TInput>(
  schema: ZodType<TInput>,
  action: (input: TInput) => Promise<void>,
) {
  const [state, setState] = useState<AuthFormState>({
    isSubmitting: false,
    error: null,
    fieldErrors: {},
  });

  const submit = useCallback(
    async (raw: Record<string, unknown>) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.');
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setState({ isSubmitting: false, error: null, fieldErrors });
        return false;
      }

      setState({ isSubmitting: true, error: null, fieldErrors: {} });
      try {
        await action(parsed.data);
        setState({ isSubmitting: false, error: null, fieldErrors: {} });
        return true;
      } catch (error) {
        setState({
          isSubmitting: false,
          error: error instanceof Error ? error.message : 'Something went wrong',
          fieldErrors: {},
        });
        return false;
      }
    },
    [schema, action],
  );

  return { ...state, submit };
}
