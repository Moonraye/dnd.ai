import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ChatMessagePayload,
  DiceRollMetadata,
  GameStateLogPayload,
  SessionSummary,
  SenderType,
} from '@dnd/shared';
import type {
  CampaignSession,
  ChatMessage,
  ChatVisibility,
} from '../generated/prisma/client';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toStateLogPayload } from '../ai/game-state-log.mapper';
import type { CreateLobbyDto } from './dto/create-lobby.dto';

const RECENT_MESSAGES_LIMIT = 100;

@Injectable()
export class GameSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createLobby(
    creatorId: string,
    dto: CreateLobbyDto,
  ): Promise<SessionSummary> {
    const session = await this.prisma.campaignSession.create({
      data: {
        title: dto.title,
        creatorId,
        sessionMembers: {
          create: { userId: creatorId },
        },
      },
    });
    return this.toSessionSummary(session);
  }

  async isMember(sessionId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.sessionMember.findUnique({
      where: {
        userId_sessionId: { userId, sessionId },
      },
    });
    return !!member;
  }

  async listLobbies(): Promise<SessionSummary[]> {
    const sessions = await this.prisma.campaignSession.findMany({
      where: { status: 'LOBBY' },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((session) => this.toSessionSummary(session));
  }

  async getSession(id: string): Promise<SessionSummary> {
    const session = await this.prisma.campaignSession.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }
    return this.toSessionSummary(session);
  }

  async addChatMessage(
    sessionId: string,
    senderName: string,
    messageText: string,
    options?: {
      senderType?: SenderType;
      visibility?: ChatVisibility;
      senderUserId?: string | null;
      senderCharacterId?: string | null;
      recipientUserId?: string | null;
      recipientCharacterId?: string | null;
      recipientName?: string | null;
    },
  ): Promise<ChatMessagePayload> {
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: options?.senderType ?? 'HUMAN',
        senderName,
        messageText,
        visibility: options?.visibility ?? 'PUBLIC',
        senderUserId: options?.senderUserId ?? null,
        senderCharacterId: options?.senderCharacterId ?? null,
        recipientUserId: options?.recipientUserId ?? null,
        recipientCharacterId: options?.recipientCharacterId ?? null,
        recipientName: options?.recipientName ?? null,
      },
    });
    return this.toChatPayload(message, options?.senderUserId || undefined);
  }

  /**
   * Persist a server-generated SYSTEM message (e.g. a dice roll). The dice
   * card rides the same chat feed, so ADR 6 catch-up/recovery is unchanged.
   */
  async addSystemMessage(
    sessionId: string,
    senderName: string,
    messageText: string,
    metadata?: DiceRollMetadata | null,
  ): Promise<ChatMessagePayload> {
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: 'SYSTEM',
        senderName,
        messageText,
        metadata: metadata ? (metadata as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
    return this.toChatPayload(message);
  }

  /**
   * ADR 6: on (re)join, return only messages the client is missing.
   * Uses the `[sessionId, createdAt]` index.
   */
  async getMessagesSince(
    sessionId: string,
    since?: string,
    userId?: string,
  ): Promise<ChatMessagePayload[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        sessionId,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      orderBy: { createdAt: since ? 'asc' : 'desc' },
      take: RECENT_MESSAGES_LIMIT,
    });
    const payloads = messages.map((message) => this.toChatPayload(message, userId));
    return since ? payloads : payloads.reverse();
  }

  /**
   * The AI-maintained campaign memory for a session, or null if the AI has not
   * written any state yet. Hydrates the Campaign Journal on join.
   */
  async getStateLog(sessionId: string): Promise<GameStateLogPayload | null> {
    const log = await this.prisma.gameStateLog.findUnique({
      where: { sessionId },
    });
    return log ? toStateLogPayload(log) : null;
  }

  async getChatMessageById(id: string): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findUnique({
      where: { id },
    });
  }

  private toSessionSummary(session: CampaignSession): SessionSummary {
    return {
      id: session.id,
      title: session.title,
      creatorId: session.creatorId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
    };
  }

  toChatPayload(message: ChatMessage, userId?: string): ChatMessagePayload {
    let text = message.messageText;
    if (message.visibility === 'WHISPER') {
      const isAuthorized =
        userId &&
        (userId === message.senderUserId || userId === message.recipientUserId);
      if (!isAuthorized) {
        text = `${message.senderName} whispers to ${message.recipientName ?? 'someone'}...`;
      }
    }
    return {
      id: message.id,
      sessionId: message.sessionId,
      senderType: message.senderType,
      senderName: message.senderName,
      messageText: text,
      metadata: (message.metadata as DiceRollMetadata | null) ?? null,
      visibility: message.visibility,
      recipientId: message.recipientCharacterId || message.recipientUserId || null,
      recipientName: message.recipientName,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
