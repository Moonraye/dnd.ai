'use client';

import {
  WS_EVENTS,
  type AckResponse,
  type CharacterSheetPayload,
  type ChatMessagePayload,
  type GameStateLogPayload,
  type JoinSessionResult,
} from '@dnd/shared';
import { useState, useEffect } from 'react';
import { getSocket } from '@/shared/api/socketClient';
import { useSessionStore } from '@/shared/store/sessionStore';
import { JOIN_ERROR_KEYS } from './resolveJoinError';

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
    // Set when this effect is torn down (session switch / unmount) so a
    // still-in-flight join ack can never repopulate the store for a session
    // the user has already left.
    let cancelled = false;

    const socket = getSocket();
    let isJoining = false;
    // Blocks joins until rehydration + setActiveSession have run, so a
    // `connect` event racing hydration can't join with a stale cursor.
    let ready = false;

    const join = async () => {
      if (isJoining || cancelled || !ready) return;
      isJoining = true;
      store.getState().setJoinStatus('connecting');
      try {
        const response = (await socket
          .timeout(JOIN_ACK_TIMEOUT_MS)
          .emitWithAck(WS_EVENTS.JOIN_SESSION, {
            sessionId,
            since: store.getState().lastMessageAt ?? undefined,
          })) as AckResponse<JoinSessionResult>;

        if (cancelled) return;
        if (!response.success) {
          store.getState().setJoinStatus('error', response.error);
          return;
        }
        store.getState().setSessionInfo(response.data.session);
        store.getState().addMessages(response.data.messages);
        store.getState().setCharacters(response.data.characters);
        store.getState().setStateLog(response.data.stateLog);
        store.getState().setJoinStatus('joined');
      } catch {
        if (!cancelled) {
          store.getState().setJoinStatus('error', JOIN_ERROR_KEYS.connectionTimedOut);
        }
      } finally {
        isJoining = false;
      }
    };

    const onConnect = () => void join();
    const onChatMessage = (message: ChatMessagePayload) =>
      store.getState().addMessages([message]);
    const onCharacterUpdated = (character: CharacterSheetPayload) =>
      store.getState().upsertCharacter(character);
    const onCharacterDeleted = (payload: { id: string; name: string }) =>
      store.getState().removeCharacter(payload.id);
    const onStateLogUpdated = (stateLog: GameStateLogPayload) =>
      store.getState().setStateLog(stateLog);
    const onAiThinking = (payload: { characterId: string; thinking: boolean }) =>
      store.getState().setCharacterThinking(payload.characterId, payload.thinking);
    const onDisconnect = () => store.getState().setJoinStatus('connecting');
    const onConnectError = () =>
      store.getState().setJoinStatus('error', JOIN_ERROR_KEYS.unableToConnect);

    socket.on('connect', onConnect);
    socket.on(WS_EVENTS.CHAT_MESSAGE, onChatMessage);
    socket.on(WS_EVENTS.CHARACTER_UPDATED, onCharacterUpdated);
    socket.on(WS_EVENTS.CHARACTER_DELETED, onCharacterDeleted);
    socket.on(WS_EVENTS.STATE_LOG_UPDATED, onStateLogUpdated);
    socket.on(WS_EVENTS.AI_THINKING, onAiThinking);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // skipHydration store: await the persisted cursor before joining so a
    // stale `{ sessionId, lastMessageAt }` can't be restored over the reset
    // store after `join()` has already read the cursor.
    void (async () => {
      await store.persist.rehydrate();
      if (cancelled) return;
      store.getState().setActiveSession(sessionId);
      ready = true;

      // No-op if already connected (e.g. navigating between sessions)...
      socket.connect();
      // ...in which case `connect` will not fire again, so join explicitly.
      if (socket.connected) void join();
    })();

    return () => {
      cancelled = true;
      // Remove only our listeners; the singleton stays connected. Never
      // disconnect here — StrictMode remounts would kill the live socket.
      socket.off('connect', onConnect);
      socket.off(WS_EVENTS.CHAT_MESSAGE, onChatMessage);
      socket.off(WS_EVENTS.CHARACTER_UPDATED, onCharacterUpdated);
      socket.off(WS_EVENTS.CHARACTER_DELETED, onCharacterDeleted);
      socket.off(WS_EVENTS.STATE_LOG_UPDATED, onStateLogUpdated);
      socket.off(WS_EVENTS.AI_THINKING, onAiThinking);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [sessionId, retryCount]);

  return { session, messages, characters, joinStatus, joinError, retry };
}
