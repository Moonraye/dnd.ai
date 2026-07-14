import type { GoogleGenAI } from '@google/genai';
import { AiOrchestrationService } from './ai-orchestration.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CharacterSheetService } from '../user/character-sheet.service';
import type { DiceService } from '../game-session/dice.service';

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
    chatMessage: {
      findMany: prismaFindManyMessages,
      create: prismaCreateMessage,
    },
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

  const roll = jest.fn();
  const diceService = {
    roll,
  } as unknown as DiceService;

  const service = new AiOrchestrationService(
    genai,
    prisma,
    characterSheetService,
    diceService,
  );

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
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
    });
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
    generateContent.mockResolvedValue({
      text: JSON.stringify(responsePayload),
    });

    const onBroadcast = jest.fn();

    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(generateContent).toHaveBeenCalled();
    expect(prismaCreateMessage).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-uuid',
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'The orc falls.',
        senderCharacterId: 'ai-sheet-uuid',
        recipientUserId: null,
        recipientCharacterId: null,
        recipientName: null,
        visibility: 'PUBLIC',
      },
    });
    expect(characterSheetServiceUpdateSheetById).toHaveBeenCalledWith(
      'player-sheet-uuid',
      {
        hpCurrent: 10,
      },
    );
    expect(onBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'The orc falls.',
      }),
      [{ id: 'player-sheet-uuid', name: 'Legolas', hpCurrent: 10, hpMax: 30 }],
      // hp-only update leaves the campaign log untouched → no state-log payload.
      null,
    );
  });

  it('broadcasts the mapped state-log payload after a campaign-log update', async () => {
    prismaFindManySheets.mockResolvedValue([
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
    ]);
    prismaFindManyMessages.mockResolvedValue([
      {
        senderType: 'HUMAN',
        senderName: 'Player',
        messageText: 'We enter the cave',
      },
    ]);
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
    });
    prismaCreateMessage.mockResolvedValue({
      id: 'msg-uuid',
      sessionId: 'session-uuid',
      senderType: 'AI_DM',
      senderName: 'Dungeon Master',
      messageText: 'A dragon stirs.',
      createdAt: new Date(),
    });

    const updatedAt = new Date('2026-07-12T00:00:00.000Z');
    prismaUpdateStateLog.mockResolvedValue({
      id: 'log-uuid',
      sessionId: 'session-uuid',
      activeQuests: ['Slay the dragon'],
      npcRelationships: { Elder: 'grateful' },
      campaignSummary: { text: 'The party entered the cave.' },
      updatedAt,
    });

    // Model emits npcRelationships as the schema-shaped array; the service
    // folds it into a string→string record before persisting.
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        messageText: 'A dragon stirs.',
        stateUpdate: {
          activeQuests: ['Slay the dragon'],
          npcRelationships: [{ name: 'Elder', status: 'grateful' }],
          campaignSummary: 'The party entered the cave.',
        },
      }),
    });

    const onBroadcast = jest.fn();
    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(prismaUpdateStateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          npcRelationships: { Elder: 'grateful' },
        }),
      }),
    );
    expect(onBroadcast).toHaveBeenCalledWith(expect.any(Object), [], {
      sessionId: 'session-uuid',
      activeQuests: ['Slay the dragon'],
      npcRelationships: { Elder: 'grateful' },
      campaignSummary: 'The party entered the cave.',
      keyFacts: [],
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('appends the summary sentence and accumulates keyFacts without erasing prior canon', async () => {
    prismaFindManySheets.mockResolvedValue([
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
    ]);
    prismaFindManyMessages.mockResolvedValue([
      { senderType: 'HUMAN', senderName: 'Player', messageText: 'We sail on' },
    ]);
    // Existing canon already stored from earlier turns.
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
      campaignSummary: { text: 'Chapter one.' },
      keyFacts: ['Bram the blacksmith is dead'],
    });
    prismaCreateMessage.mockResolvedValue({
      id: 'msg-uuid',
      sessionId: 'session-uuid',
      senderType: 'AI_DM',
      senderName: 'Dungeon Master',
      messageText: 'The harbor comes into view.',
      createdAt: new Date(),
    });
    prismaUpdateStateLog.mockResolvedValue({
      id: 'log-uuid',
      sessionId: 'session-uuid',
      activeQuests: [],
      npcRelationships: {},
      campaignSummary: { text: 'Chapter one. The party reached the harbor.' },
      keyFacts: [
        'Bram the blacksmith is dead',
        'Captain Mira promised safe passage',
      ],
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    });

    // The model echoes a duplicate fact and adds one new one, plus a single
    // new summary sentence (not the running summary). Provenance-tagged.
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        messageText: 'The harbor comes into view.',
        stateUpdate: {
          campaignSummary: 'The party reached the harbor.',
          keyFacts: [
            { text: 'Bram the blacksmith is dead', source: 'dm' },
            { text: 'Captain Mira promised safe passage', source: 'dm' },
          ],
        },
      }),
    });

    await service.evaluateTurns('session-uuid', jest.fn());

    expect(prismaUpdateStateLog).toHaveBeenCalledTimes(1);
    const updateArg = prismaUpdateStateLog.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // Summary is appended to prior text, not replaced.
    expect(updateArg.data.campaignSummary).toEqual({
      text: 'Chapter one. The party reached the harbor.',
    });
    // keyFacts accumulate and dedup the echoed fact — prior canon survives, and
    // the legacy bare-string row is coerced to dm-canon.
    expect(updateArg.data.keyFacts).toEqual([
      { text: 'Bram the blacksmith is dead', source: 'dm' },
      { text: 'Captain Mira promised safe passage', source: 'dm' },
    ]);
  });

  it('tags player-claim facts and folds evicted canon into the summary at the cap', async () => {
    prismaFindManySheets.mockResolvedValue([
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
    ]);
    prismaFindManyMessages.mockResolvedValue([
      { senderType: 'HUMAN', senderName: 'Player', messageText: 'I am a king' },
    ]);
    // Ledger already holds 99 facts; two more will overflow the cap of 100.
    const existingFacts = Array.from({ length: 99 }, (_, i) => ({
      text: `fact ${i}`,
      source: 'dm' as const,
    }));
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
      campaignSummary: { text: 'The tale so far.' },
      keyFacts: existingFacts,
    });
    prismaCreateMessage.mockResolvedValue({
      id: 'msg-uuid',
      sessionId: 'session-uuid',
      senderType: 'AI_DM',
      senderName: 'Dungeon Master',
      messageText: 'A bold claim.',
      createdAt: new Date(),
    });
    prismaUpdateStateLog.mockResolvedValue({
      id: 'log-uuid',
      sessionId: 'session-uuid',
      activeQuests: [],
      npcRelationships: {},
      campaignSummary: { text: 'folded' },
      keyFacts: [],
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    });

    generateContent.mockResolvedValue({
      text: JSON.stringify({
        messageText: 'A bold claim.',
        stateUpdate: {
          campaignSummary: 'The traveler asserted royal blood.',
          keyFacts: [
            { text: 'The traveler claims to be a king', source: 'player' },
            { text: 'A storm gathers over the keep', source: 'dm' },
          ],
        },
      }),
    });

    await service.evaluateTurns('session-uuid', jest.fn());

    const updateArg = prismaUpdateStateLog.mock.calls[0][0] as {
      data: { keyFacts: Array<{ text: string; source: string }>; campaignSummary: { text: string } };
    };
    // Cap is enforced: 99 + 2 new = 101 → oldest one evicted, 100 retained.
    expect(updateArg.data.keyFacts).toHaveLength(100);
    // The player-claim keeps its provenance tag.
    expect(updateArg.data.keyFacts).toContainEqual({
      text: 'The traveler claims to be a king',
      source: 'player',
    });
    // The oldest evicted fact ("fact 0") is folded into the summary, not lost.
    expect(updateArg.data.campaignSummary.text).toContain('Earlier: fact 0');
    expect(updateArg.data.keyFacts).not.toContainEqual({
      text: 'fact 0',
      source: 'dm',
    });
  });

  it('does not overwrite stored NPCs when the model returns an empty NPC array', async () => {
    prismaFindManySheets.mockResolvedValue([
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
    ]);
    prismaFindManyMessages.mockResolvedValue([
      { senderType: 'HUMAN', senderName: 'Player', messageText: 'Press on' },
    ]);
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
    });
    prismaCreateMessage.mockResolvedValue({
      id: 'msg-uuid',
      sessionId: 'session-uuid',
      senderType: 'AI_DM',
      senderName: 'Dungeon Master',
      messageText: 'The road winds on.',
      createdAt: new Date(),
    });
    prismaUpdateStateLog.mockResolvedValue({
      id: 'log-uuid',
      sessionId: 'session-uuid',
      activeQuests: [],
      npcRelationships: {},
      campaignSummary: { text: 'The journey continues.' },
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    });

    generateContent.mockResolvedValue({
      text: JSON.stringify({
        messageText: 'The road winds on.',
        stateUpdate: {
          npcRelationships: [],
          campaignSummary: 'The journey continues.',
        },
      }),
    });

    await service.evaluateTurns('session-uuid', jest.fn());

    expect(prismaUpdateStateLog).toHaveBeenCalledTimes(1);
    const updateArg = prismaUpdateStateLog.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).not.toHaveProperty('npcRelationships');
    expect(updateArg.data).toHaveProperty('campaignSummary');
  });

  it('rejects oversized model output and writes nothing', async () => {
    prismaFindManySheets.mockResolvedValue([
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
    ]);
    prismaFindManyMessages.mockResolvedValue([
      { senderType: 'HUMAN', senderName: 'Player', messageText: 'Look around' },
    ]);
    prismaFindUniqueStateLog.mockResolvedValue({
      id: 'log-uuid',
      activeQuests: [],
    });

    // 21 quests exceeds the schema cap of 20.
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        messageText: 'Too much.',
        stateUpdate: {
          activeQuests: Array.from({ length: 21 }, (_, i) => `quest ${i}`),
        },
      }),
    });

    const onBroadcast = jest.fn();
    await service.evaluateTurns('session-uuid', onBroadcast);

    expect(prismaCreateMessage).not.toHaveBeenCalled();
    expect(prismaUpdateStateLog).not.toHaveBeenCalled();
    expect(onBroadcast).not.toHaveBeenCalled();
  });

  describe('Phase C: Interactivity Tests', () => {
    it('executes and broadcasts AI-initiated dice rolls', async () => {
      prismaFindManySheets.mockResolvedValue([
        {
          id: 'companion-uuid',
          name: 'Gimli',
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          hpCurrent: 20,
          hpMax: 20,
          stats: {},
          inventory: [],
        },
      ]);
      prismaFindManyMessages.mockResolvedValue([
        { senderType: 'HUMAN', senderName: 'Player', messageText: 'Jump the chasm!' },
      ]);
      prismaFindUniqueStateLog.mockResolvedValue({
        id: 'log-uuid',
        activeQuests: [],
      });
      prismaCreateMessage.mockResolvedValue({
        id: 'msg-uuid',
        sessionId: 'session-uuid',
        senderType: 'AI_PLAYER',
        senderName: 'Gimli',
        messageText: 'I jump!',
        createdAt: new Date(),
      });

      generateContent.mockResolvedValue({
        text: JSON.stringify({
          messageText: 'I jump!',
          diceRolls: [
            { characterName: 'Gimli', notation: '1d20+5', reason: 'athletics check' },
          ],
        }),
      });

      roll.mockReturnValue({
        messageText: 'Gimli rolled 1d20+5 → 18',
        metadata: { kind: 'dice_roll', total: 18 },
      });

      const onBroadcast = jest.fn();
      await service.evaluateTurns('session-uuid', onBroadcast, 'companion-uuid');

      expect(roll).toHaveBeenCalledWith('1d20+5', 'Gimli');
      expect(prismaCreateMessage).toHaveBeenCalledTimes(2);
      expect(onBroadcast).toHaveBeenCalledTimes(2);
    });

    it('strips DM-only fields and filters relationship keys for non-DM sheets', async () => {
      prismaFindManySheets.mockResolvedValue([
        {
          id: 'companion-uuid',
          name: 'Gimli',
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          hpCurrent: 20,
          hpMax: 20,
          stats: {},
          inventory: [],
        },
      ]);
      prismaFindManyMessages.mockResolvedValue([
        { senderType: 'HUMAN', senderName: 'Player', messageText: 'Hello companion' },
      ]);
      prismaFindUniqueStateLog.mockResolvedValue({
        id: 'log-uuid',
        activeQuests: [],
      });
      prismaCreateMessage.mockResolvedValue({
        id: 'msg-uuid',
        sessionId: 'session-uuid',
        senderType: 'AI_PLAYER',
        senderName: 'Gimli',
        messageText: 'Hello!',
        createdAt: new Date(),
      });
      prismaUpdateStateLog.mockResolvedValue({
        id: 'log-uuid',
        sessionId: 'session-uuid',
        activeQuests: [],
        npcRelationships: { Gimli: 'Likes Thorin' },
        campaignSummary: { text: '' },
        keyFacts: [],
        updatedAt: new Date(),
      });

      generateContent.mockResolvedValue({
        text: JSON.stringify({
          messageText: 'Hello!',
          stateUpdate: {
            activeQuests: ['Defeat the dragon'],
            campaignSummary: 'The quest began.',
            keyFacts: [{ text: 'Gimli met Legolas', source: 'dm' }],
            npcRelationships: {
              Gimli: 'Likes Thorin',
              Legolas: 'Likes Aragorn',
            },
          },
        }),
      });

      await service.evaluateTurns('session-uuid', jest.fn(), 'companion-uuid');

      expect(prismaUpdateStateLog).toHaveBeenCalledTimes(1);
      const updateArg = prismaUpdateStateLog.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      // Quests, summary, and keyFacts are stripped for companion
      expect(updateArg.data).not.toHaveProperty('activeQuests');
      expect(updateArg.data).not.toHaveProperty('campaignSummary');
      expect(updateArg.data).not.toHaveProperty('keyFacts');
      // Relationships contains only Gimli's own attitude key
      const rels = updateArg.data.npcRelationships as Record<string, string>;
      expect(rels).toHaveProperty('Gimli');
      expect(rels).not.toHaveProperty('Legolas');
    });

    it('permits 1-hop AI banter but halts on 2 consecutive AI responses', async () => {
      prismaFindManySheets.mockResolvedValue([
        {
          id: 'dm-sheet-uuid',
          name: 'Dungeon Master',
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          hpCurrent: 100,
          hpMax: 100,
          stats: {},
          inventory: [],
        },
      ]);
      prismaFindUniqueStateLog.mockResolvedValue({
        id: 'log-uuid',
        activeQuests: [],
      });
      prismaCreateMessage.mockResolvedValue({
        id: 'msg-uuid',
        sessionId: 'session-uuid',
        senderType: 'AI_DM',
        senderName: 'Dungeon Master',
        messageText: 'I watch.',
        createdAt: new Date(),
      });

      // 1. One AI message after a human message: Banter allowed (1 hop)
      prismaFindManyMessages.mockResolvedValue([
        { senderType: 'AI_DM', senderName: 'Dungeon Master', messageText: 'The dragon roars.' },
        { senderType: 'HUMAN', senderName: 'Player', messageText: 'I attack' },
      ]);
      generateContent.mockResolvedValue({
        text: JSON.stringify({ messageText: 'I watch.' }),
      });

      await service.evaluateTurns('session-uuid', jest.fn());
      expect(generateContent).toHaveBeenCalledTimes(1);

      // 2. Two consecutive AI messages: Halt banter (2 hops)
      jest.clearAllMocks();
      prismaFindManySheets.mockResolvedValue([
        {
          id: 'dm-sheet-uuid',
          name: 'Dungeon Master',
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          hpCurrent: 100,
          hpMax: 100,
          stats: {},
          inventory: [],
        },
      ]);
      prismaFindUniqueStateLog.mockResolvedValue({
        id: 'log-uuid',
        activeQuests: [],
      });
      prismaFindManyMessages.mockResolvedValue([
        { senderType: 'AI_PLAYER', senderName: 'Gimli', messageText: 'I hit!' },
        { senderType: 'AI_DM', senderName: 'Dungeon Master', messageText: 'The dragon roars.' },
        { senderType: 'HUMAN', senderName: 'Player', messageText: 'I attack' },
      ]);

      await service.evaluateTurns('session-uuid', jest.fn());
      expect(generateContent).not.toHaveBeenCalled();
    });
  });
});
