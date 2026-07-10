import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChatMessagePayload, SessionSummary } from '@dnd/shared';
import type { CampaignSession, ChatMessage } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
      data: { title: dto.title, creatorId },
    });
    return this.toSessionSummary(session);
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
  ): Promise<ChatMessagePayload> {
    const message = await this.prisma.chatMessage.create({
      data: { sessionId, senderType: 'HUMAN', senderName, messageText },
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
  ): Promise<ChatMessagePayload[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        sessionId,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: RECENT_MESSAGES_LIMIT,
    });
    return messages.map((message) => this.toChatPayload(message));
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

  private toChatPayload(message: ChatMessage): ChatMessagePayload {
    return {
      id: message.id,
      sessionId: message.sessionId,
      senderType: message.senderType,
      senderName: message.senderName,
      messageText: message.messageText,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
