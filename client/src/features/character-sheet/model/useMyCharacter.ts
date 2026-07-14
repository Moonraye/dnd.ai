'use client';

import { useAuthStore } from '@/shared/store/authStore';
import { useSessionStore } from '@/shared/store/sessionStore';

/**
 * The caller's own human-controlled sheet for the active session, plus whether
 * the answer is trustworthy yet. `isKnown` only turns true once the join has
 * hydrated the party list, so the creation gate never flashes prematurely.
 */
export function useMyCharacter() {
  const characters = useSessionStore((state) => state.characters);
  const joinStatus = useSessionStore((state) => state.joinStatus);
  const userId = useAuthStore((state) => state.user?.id);

  const myCharacter =
    characters.find(
      (character) =>
        character.userId === userId && character.aiProvider === null,
    ) ?? null;

  return { myCharacter, isKnown: joinStatus === 'joined' };
}
