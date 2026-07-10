import { z } from 'zod';
import type { SenderType, SessionStatus } from './types';

/** Socket.io event names shared by client and server (ADR 1). */
export const WS_EVENTS = {
  /** client → server, with ack: join a campaign session room. */
  JOIN_SESSION: 'session:join',
  /** client → server, with ack: send a chat message. */
  SEND_CHAT: 'chat:send',
  /** server → client broadcast: a new chat message in the room. */
  CHAT_MESSAGE: 'chat:message',
} as const;

export const JoinSessionSchema = z.object({
  sessionId: z.uuid(),
  /**
   * ADR 6: ISO timestamp of the newest message the client already has;
   * the server returns only messages created after it.
   */
  since: z.iso.datetime().optional(),
});

export type JoinSessionInput = z.infer<typeof JoinSessionSchema>;

/**
 * ADR 1: standardized socket.io acknowledgement envelope — the WS
 * equivalent of an HTTP response.
 */
export type AckResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Wire representations: dates cross the socket as ISO strings. */
export interface SessionSummary {
  id: string;
  title: string;
  creatorId: string;
  status: SessionStatus;
  createdAt: string;
}

export interface ChatMessagePayload {
  id: string;
  sessionId: string;
  senderType: SenderType;
  senderName: string;
  messageText: string;
  createdAt: string;
}

export interface JoinSessionResult {
  session: SessionSummary;
  messages: ChatMessagePayload[];
}
