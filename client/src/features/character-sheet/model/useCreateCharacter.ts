'use client';

import { CharacterSheetSchema, type CharacterSheetInput } from '@dnd/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useSessionStore } from '@/shared/store/sessionStore';
import { createCharacter } from '../api/characterApi';

export function useCreateCharacter(sessionId: string) {
  const { t } = useTranslation();
  const upsertCharacter = useSessionStore((state) => state.upsertCharacter);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: CharacterSheetInput): Promise<boolean> => {
      // ADR 3: same shared schema the server validates with.
      const parsed = CharacterSheetSchema.safeParse(input);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return false;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const sheet = await createCharacter(sessionId, parsed.data);
        // Seed the store so the creation gate opens immediately (the WS
        // broadcast reaches other players).
        upsertCharacter(sheet);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.errors.createCharacterFailed,
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, upsertCharacter, t],
  );

  return { submit, isSubmitting, error };
}
