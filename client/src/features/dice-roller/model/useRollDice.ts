'use client';

import {
  DiceRollSchema,
  WS_EVENTS,
  parseDiceNotation,
  type AckResponse,
  type ChatMessagePayload,
} from '@dnd/shared';
import { useCallback, useState } from 'react';
import { getSocket } from '@/shared/api/socketClient';
import { useTranslation } from '@/shared/i18n';

const ROLL_ACK_TIMEOUT_MS = 5000;

export function useRollDice(sessionId: string) {
  const { t } = useTranslation();
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = useCallback(
    async (notation: string): Promise<boolean> => {
      // Instant client-side feedback with the shared grammar authority.
      const parsed = parseDiceNotation(notation);
      if (!parsed.success) {
        setError(parsed.error);
        return false;
      }
      const payload = DiceRollSchema.safeParse({
        sessionId,
        notation: parsed.data.notation,
      });
      if (!payload.success) {
        setError(payload.error.issues[0].message);
        return false;
      }

      setIsRolling(true);
      setError(null);
      try {
        const response = (await getSocket()
          .timeout(ROLL_ACK_TIMEOUT_MS)
          .emitWithAck(
            WS_EVENTS.ROLL_DICE,
            payload.data,
          )) as AckResponse<ChatMessagePayload>;

        if (!response.success) {
          setError(response.error);
          return false;
        }
        // The result arrives via the normal chat:message broadcast — the
        // store appends it, so nothing is added locally here.
        return true;
      } catch {
        setError(t.errors.rollFailed);
        return false;
      } finally {
        setIsRolling(false);
      }
    },
    [sessionId, t],
  );

  return { roll, isRolling, error };
}
