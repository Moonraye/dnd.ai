'use client';

import { CreateLobbySchema } from '@dnd/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createLobby } from '../api/lobbyApi';

export function useCreateLobby() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (title: string): Promise<boolean> => {
      // ADR 3: same shared schema the server validates with.
      const parsed = CreateLobbySchema.safeParse({ title });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return false;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const session = await createLobby(parsed.data);
        // SessionPage owns the WS join; creating only navigates.
        router.push(`/session/${session.id}`);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create lobby');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return { submit, isSubmitting, error };
}
