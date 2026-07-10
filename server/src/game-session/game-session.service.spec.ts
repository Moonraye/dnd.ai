import { NotFoundException } from '@nestjs/common';
import type { CampaignSession, ChatMessage } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
  const sessionCreate = jest.fn();
  const sessionFindMany = jest.fn();
  const sessionFindUnique = jest.fn();
  const messageCreate = jest.fn();
  const messageFindMany = jest.fn();
  const prisma = {
    campaignSession: {
      create: sessionCreate,
      findMany: sessionFindMany,
      findUnique: sessionFindUnique,
    },
    chatMessage: { create: messageCreate, findMany: messageFindMany },
  } as unknown as PrismaService;
  const service = new GameSessionService(prisma);

  const dbSession: CampaignSession = {
    id: 'session-uuid',
    title: 'Test Lobby',
    creatorId: 'user-uuid',
    status: 'LOBBY',
    createdAt: new Date('2026-07-10T12:00:00.000Z'),
  };

  const dbMessage: ChatMessage = {
    id: 'message-uuid',
    sessionId: 'session-uuid',
    senderType: 'HUMAN',
    senderName: 'player@example.com',
    messageText: 'Roll for initiative!',
    createdAt: new Date('2026-07-10T12:05:00.000Z'),
  };

  beforeEach(() => jest.resetAllMocks());

  it('creates a lobby owned by the creator and serializes dates', async () => {
    sessionCreate.mockResolvedValue(dbSession);

    const result = await service.createLobby('user-uuid', {
      title: 'Test Lobby',
    });

    expect(sessionCreate).toHaveBeenCalledWith({
      data: { title: 'Test Lobby', creatorId: 'user-uuid' },
    });
    expect(result).toEqual({
      id: 'session-uuid',
      title: 'Test Lobby',
      creatorId: 'user-uuid',
      status: 'LOBBY',
      createdAt: '2026-07-10T12:00:00.000Z',
    });
  });

  it('lists only sessions still in the lobby state', async () => {
    sessionFindMany.mockResolvedValue([dbSession]);

    const result = await service.listLobbies();

    expect(sessionFindMany).toHaveBeenCalledWith({
      where: { status: 'LOBBY' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundException for a missing session', async () => {
    sessionFindUnique.mockResolvedValue(null);

    await expect(service.getSession('missing-uuid')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('persists chat messages as HUMAN sender', async () => {
    messageCreate.mockResolvedValue(dbMessage);

    const result = await service.addChatMessage(
      'session-uuid',
      'player@example.com',
      'Roll for initiative!',
    );

    expect(messageCreate).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-uuid',
        senderType: 'HUMAN',
        senderName: 'player@example.com',
        messageText: 'Roll for initiative!',
      },
    });
    expect(result.createdAt).toBe('2026-07-10T12:05:00.000Z');
  });

  it('filters messages by the since timestamp when provided', async () => {
    messageFindMany.mockResolvedValue([dbMessage]);

    await service.getMessagesSince('session-uuid', '2026-07-10T12:00:00.000Z');

    expect(messageFindMany).toHaveBeenCalledWith({
      where: {
        sessionId: 'session-uuid',
        createdAt: { gt: new Date('2026-07-10T12:00:00.000Z') },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  });

  it('returns recent messages without a createdAt filter when since is omitted', async () => {
    messageFindMany.mockResolvedValue([]);

    await service.getMessagesSince('session-uuid');

    expect(messageFindMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-uuid' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  });
});
