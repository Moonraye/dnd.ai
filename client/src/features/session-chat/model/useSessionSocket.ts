'use client';

import {
  WS_EVENTS,
  type AckResponse,
  type CharacterSheetPayload,
  type ChatMessagePayload,
  type JoinSessionResult,
} from '@dnd/shared';
import { useState, useEffect } from 'react';
import { getSocket } from '@/shared/api/socketClient';
import { useSessionStore } from '@/shared/store/sessionStore';

const JOIN_ACK_TIMEOUT_MS = 5000;

/**
 * Connects the Socket.io singleton and keeps the session store in sync.
 *
 * Joining is hung on the `connect` event so the initial connection, a
 * token-expiry reconnect (ADR 2), and a post-server-restart reconnect all
 * re-join and catch up on missed messages (ADR 6) through one code path.
 */
export function useSessionSocket(sessionId: string) {
  const [retryCount, setRetryCount] = useState(0);
  const session = useSessionStore((state) => state.session);
  const messages = useSessionStore((state) => state.messages);
  const characters = useSessionStore((state) => state.characters);
  const joinStatus = useSessionStore((state) => state.joinStatus);
  const joinError = useSessionStore((state) => state.joinError);

  const retry = () => setRetryCount((c) => c + 1);

  useEffect(() => {
    const store = useSessionStore;
    // skipHydration store: pull the persisted cursor in before joining.
    void store.persist.rehydrate();
    store.getState().setActiveSession(sessionId);

    const socket = getSocket();
    let isJoining = false;

    const join = async () => {
      if (isJoining) return;
      isJoining = true;
      store.getState().setJoinStatus('connecting');
      try {
        const response = (await socket
          .timeout(JOIN_ACK_TIMEOUT_MS)
          .emitWithAck(WS_EVENTS.JOIN_SESSION, {
            sessionId,
            since: store.getState().lastMessageAt ?? undefined,
          })) as AckResponse<JoinSessionResult>;

        if (!response.success) {
          store.getState().setJoinStatus('error', response.error);
          return;
        }
        store.getState().setSessionInfo(response.data.session);
        store.getState().addMessages(response.data.messages);
        store.getState().setCharacters(response.data.characters);
        store.getState().setJoinStatus('joined');
      } catch {
        store.getState().setJoinStatus('error', 'Connection timed out');
      } finally {
        isJoining = false;
      }
    };

    const onConnect = () => void join();
    const onChatMessage = (message: ChatMessagePayload) =>
      store.getState().addMessages([message]);
    const onCharacterUpdated = (character: CharacterSheetPayload) =>
      store.getState().upsertCharacter(character);
    const onDisconnect = () => store.getState().setJoinStatus('connecting');
    const onConnectError = () =>
      store.getState().setJoinStatus('error', 'Unable to connect');

    socket.on('connect', onConnect);
    socket.on(WS_EVENTS.CHAT_MESSAGE, onChatMessage);
    socket.on(WS_EVENTS.CHARACTER_UPDATED, onCharacterUpdated);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // No-op if already connected (e.g. navigating between sessions)...
    socket.connect();
    // ...in which case `connect` will not fire again, so join explicitly.
    if (socket.connected) void join();

    return () => {
      // Remove only our listeners; the singleton stays connected. Never
      // disconnect here — StrictMode remounts would kill the live socket.
      socket.off('connect', onConnect);
      socket.off(WS_EVENTS.CHAT_MESSAGE, onChatMessage);
      socket.off(WS_EVENTS.CHARACTER_UPDATED, onCharacterUpdated);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [sessionId, retryCount]);

  return { session, messages, characters, joinStatus, joinError, retry };
}
