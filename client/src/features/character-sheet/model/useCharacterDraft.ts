'use client';

import type { CharacterSheetInput } from '@dnd/shared';
import { useCallback, useState } from 'react';
import { generateCharacterDraft } from '../api/characterApi';

/**
 * One-shot AI draft generator (decision 3). The draft only prefills the
 * creation form — saving still goes through the normal manual path.
 */
export function useCharacterDraft() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prompt: string): Promise<CharacterSheetInput | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        return await generateCharacterDraft({ prompt });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'AI draft failed — try again',
        );
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating, error };
}
