import { z } from 'zod';
import type { DiceRollMetadata } from './dice';
import type {
  AbilityScores,
  InventoryItem,
  SenderType,
  SessionStatus,
} from './types';

/** Socket.io event names shared by client and server (ADR 1). */
export const WS_EVENTS = {
  /** client → server, with ack: join a campaign session room. */
  JOIN_SESSION: 'session:join',
  /** client → server, with ack: send a chat message. */
  SEND_CHAT: 'chat:send',
  /** server → client broadcast: a new chat message in the room. */
  CHAT_MESSAGE: 'chat:message',
  /** client → server, with ack: roll dice; the result rides CHAT_MESSAGE. */
  ROLL_DICE: 'dice:roll',
  /** client → server, with ack: patch the caller's own character sheet. */
  UPDATE_CHARACTER: 'character:update',
  /** server → client broadcast: a character sheet in the room changed. */
  CHARACTER_UPDATED: 'character:updated',
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
  /**
   * Present on SYSTEM dice-roll messages so the client renders a rich card.
   * Optional/nullable: legacy rows and plain chat carry no metadata.
   */
  metadata?: DiceRollMetadata | null;
}

/** Wire representation of a persisted character sheet. */
export interface CharacterSheetPayload {
  id: string;
  userId: string;
  sessionId: string;
  name: string;
  hpCurrent: number;
  hpMax: number;
  stats: AbilityScores;
  inventory: InventoryItem[];
  aiProvider: string | null;
  aiModel: string | null;
}

export interface JoinSessionResult {
  session: SessionSummary;
  messages: ChatMessagePayload[];
  /** Party sheets in the room, so the HUD strip hydrates on join. */
  characters: CharacterSheetPayload[];
}
