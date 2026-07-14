'use client';

import { CreateLobbySchema } from '@dnd/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { createLobby } from '../api/lobbyApi';

export function useCreateLobby() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous re-entrancy guard: state updates are async, so two submits in
  // the same tick would both pass an `isSubmitting` check and double-POST.
  const inFlight = useRef(false);

  const submit = useCallback(
    async (title: string): Promise<boolean> => {
      if (inFlight.current) return false;

      // ADR 3: same shared schema the server validates with.
      const parsed = CreateLobbySchema.safeParse({ title });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return false;
      }

      inFlight.current = true;
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
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return { submit, isSubmitting, error };
}
