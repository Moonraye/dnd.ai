import type { GoogleGenAI } from '@google/genai';
import { AiOrchestrationService } from './ai-orchestration.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CharacterSheetService } from '../user/character-sheet.service';

describe('AiOrchestrationService', () => {
  const generateContent = jest.fn();
  const genai = {
    models: { generateContent },
  } as unknown as GoogleGenAI;

  const prismaFindManySheets = jest.fn();
  const prismaFindManyMessages = jest.fn();
  const prismaFindUniqueStateLog = jest.fn();
  const prismaCreateStateLog = jest.fn();
  const prismaUpdateStateLog = jest.fn();
  const prismaCreateMessage = jest.fn();

  const prisma = {
    characterSheet: { findMany: prismaFindManySheets },
    chatMessage: { findMany: prismaFindManyMessages, create: prismaCreateMessage },
    gameStateLog: {
      findUnique: prismaFindUniqueStateLog,
      create: prismaCreateStateLog,
      update: prismaUpdateStateLog,
    },
  } as unknown as PrismaService;

  const characterSheetServiceUpdateSheetById = jest.fn();
  const characterSheetService = {
    updateSheetById: characterSheetServiceUpdateSheetById,
  } as unknown as CharacterSheetService;

  const service = new AiOrchestrationService(genai, prisma, characterSheetService);

  beforeEach(() => jest.resetAllMocks());

  it('skips evaluation if there are no AI sheets', async () => {
    prismaFindManySheets.mockResolvedValue([]); // no AI sheets
    const onBroadcast = jest.fn();

    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(onBroadcast).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('skips evaluation if the last message was sent by AI', async () => {
    prismaFindManySheets.mockResolvedValue([
      {
        id: 'ai-sheet-uuid',
        name: 'Thorin (AI)',
        aiProvider: 'google',
        aiModel: 'gemini-flash-latest',
        hpCurrent: 10,
        hpMax: 10,
        stats: {},
        inventory: [],
      },
    ]);
    prismaFindManyMessages.mockResolvedValue([
      {
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'Hello',
      },
    ]);
    const onBroadcast = jest.fn();

    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(onBroadcast).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('runs evaluation for AI DM, writes message and triggers state updates', async () => {
    prismaFindManySheets.mockImplementation(async (args) => {
      // Return only AI sheets when filtering for evaluateTurns step 1
      if (args && args.where && args.where.aiProvider) {
        return [
          {
            id: 'ai-sheet-uuid',
            name: 'Dungeon Master',
            aiProvider: 'google',
            aiModel: 'gemini-flash-latest',
            hpCurrent: 100,
            hpMax: 100,
            stats: {},
            inventory: [],
          },
        ];
      }
      // Return all sheets when requesting context in step 5
      return [
        {
          id: 'ai-sheet-uuid',
          name: 'Dungeon Master',
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          hpCurrent: 100,
          hpMax: 100,
          stats: {},
          inventory: [],
        },
        {
          id: 'player-sheet-uuid',
          name: 'Legolas',
          aiProvider: null,
          aiModel: null,
          hpCurrent: 15,
          hpMax: 30,
          stats: {},
          inventory: [],
        },
      ];
    });

    prismaFindManyMessages.mockResolvedValue([
      { senderType: 'HUMAN', senderName: 'Player', messageText: 'I attack' },
    ]);
    prismaFindUniqueStateLog.mockResolvedValue({ id: 'log-uuid', activeQuests: [] });
    prismaCreateMessage.mockResolvedValue({
      id: 'msg-uuid',
      sessionId: 'session-uuid',
      senderType: 'AI_DM',
      senderName: 'Dungeon Master',
      messageText: 'The orc falls.',
      createdAt: new Date(),
    });
    characterSheetServiceUpdateSheetById.mockResolvedValue({
      id: 'player-sheet-uuid',
      name: 'Legolas',
      hpCurrent: 10,
      hpMax: 30,
    });

    const responsePayload = {
      messageText: 'The orc falls.',
      stateUpdate: {
        hpChanges: [{ characterName: 'Legolas', delta: -5 }],
      },
    };
    generateContent.mockResolvedValue({ text: JSON.stringify(responsePayload) });

    const onBroadcast = jest.fn();

    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(generateContent).toHaveBeenCalled();
    expect(prismaCreateMessage).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-uuid',
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'The orc falls.',
      },
    });
    expect(characterSheetServiceUpdateSheetById).toHaveBeenCalledWith('player-sheet-uuid', {
      hpCurrent: 10,
    });
    expect(onBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'The orc falls.',
      }),
      [{ id: 'player-sheet-uuid', name: 'Legolas', hpCurrent: 10, hpMax: 30 }],
    );
  });
});
