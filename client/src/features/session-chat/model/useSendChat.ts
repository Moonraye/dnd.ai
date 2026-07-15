'use client';

import {
  SendChatMessageSchema,
  WS_EVENTS,
  type AckResponse,
  type ChatMessagePayload,
} from '@dnd/shared';
import { useCallback, useState } from 'react';
import { getSocket } from '@/shared/api/socketClient';
import { useTranslation } from '@/shared/i18n';

const SEND_ACK_TIMEOUT_MS = 5000;

export function useSendChat(sessionId: string) {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (
      messageText: string,
      command?: 'SAY' | 'SHOUT' | 'WHISPER' | null,
      targetId?: string | null,
    ): Promise<boolean> => {
      // ADR 3: same shared schema the gateway validates with.
      const parsed = SendChatMessageSchema.safeParse({
        sessionId,
        messageText,
        command,
        targetId,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return false;
      }

      setIsSending(true);
      setError(null);
      try {
        const response = (await getSocket()
          .timeout(SEND_ACK_TIMEOUT_MS)
          .emitWithAck(
            WS_EVENTS.SEND_CHAT,
            parsed.data,
          )) as AckResponse<ChatMessagePayload>;

        if (!response.success) {
          setError(response.error);
          return false;
        }
        return true;
      } catch {
        setError(t.errors.sendMessageFailed);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, t],
  );

  return { send, isSending, error };
}
