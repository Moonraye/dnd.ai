'use client';

import {
  UpdateCharacterSheetSchema,
  WS_EVENTS,
  type AckResponse,
  type CharacterSheetPayload,
  type UpdateCharacterSheetInput,
} from '@dnd/shared';
import { useCallback, useState } from 'react';
import { getSocket } from '@/shared/api/socketClient';
import { useTranslation } from '@/shared/i18n';
import { useSessionStore } from '@/shared/store/sessionStore';

const UPDATE_ACK_TIMEOUT_MS = 5000;

type CharacterPatch = Omit<UpdateCharacterSheetInput, 'sessionId'>;

export function useUpdateCharacter(sessionId: string) {
  const { t } = useTranslation();
  const upsertCharacter = useSessionStore((state) => state.upsertCharacter);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (patch: CharacterPatch): Promise<boolean> => {
      const parsed = UpdateCharacterSheetSchema.safeParse({
        ...patch,
        sessionId,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return false;
      }

      setIsSaving(true);
      setError(null);
      try {
        const response = (await getSocket()
          .timeout(UPDATE_ACK_TIMEOUT_MS)
          .emitWithAck(
            WS_EVENTS.UPDATE_CHARACTER,
            parsed.data,
          )) as AckResponse<CharacterSheetPayload>;

        if (!response.success) {
          setError(response.error);
          return false;
        }
        upsertCharacter(response.data);
        return true;
      } catch {
        setError(t.errors.updateFailed);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [sessionId, upsertCharacter, t],
  );

  return { update, isSaving, error };
}
