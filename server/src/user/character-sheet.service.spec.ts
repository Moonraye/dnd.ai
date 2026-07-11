import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { CharacterSheetInput } from '@dnd/shared';
import type {
  CampaignSession,
  CharacterSheet,
} from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { CharacterSheetService } from './character-sheet.service';

describe('CharacterSheetService', () => {
  const sessionFindUnique = jest.fn();
  const sheetCount = jest.fn();
  const sheetCreate = jest.fn();
  const sheetFindFirst = jest.fn();
  const sheetFindMany = jest.fn();
  const sheetUpdate = jest.fn();
  const prisma = {
    campaignSession: { findUnique: sessionFindUnique },
    characterSheet: {
      count: sheetCount,
      create: sheetCreate,
      findFirst: sheetFindFirst,
      findMany: sheetFindMany,
      update: sheetUpdate,
    },
  } as unknown as PrismaService;
  const service = new CharacterSheetService(prisma);

  const dbSession = { id: 'session-uuid' } as CampaignSession;

  const validInput: CharacterSheetInput = {
    name: 'Thorin',
    hpCurrent: 12,
    hpMax: 12,
    stats: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
    inventory: [{ name: 'Axe', qty: 1 }],
    aiProvider: null,
    aiModel: null,
  };

  const dbSheet: CharacterSheet = {
    id: 'sheet-uuid',
    userId: 'user-uuid',
    sessionId: 'session-uuid',
    name: 'Thorin',
    hpCurrent: 12,
    hpMax: 12,
    stats: validInput.stats,
    inventory: validInput.inventory,
    aiProvider: null,
    aiModel: null,
  };

  beforeEach(() => jest.resetAllMocks());

  it('creates a human sheet and returns a serialized payload', async () => {
    sessionFindUnique.mockResolvedValue(dbSession);
    sheetCount.mockResolvedValue(0);
    sheetCreate.mockResolvedValue(dbSheet);

    const result = await service.createSheet(
      'user-uuid',
      'session-uuid',
      validInput,
    );

    expect(sheetCount).toHaveBeenCalledWith({
      where: {
        sessionId: 'session-uuid',
        userId: 'user-uuid',
        aiProvider: null,
      },
    });
    expect(result.id).toBe('sheet-uuid');
    expect(result.stats).toEqual(validInput.stats);
  });

  it('rejects creation for a missing session', async () => {
    sessionFindUnique.mockResolvedValue(null);

    await expect(
      service.createSheet('user-uuid', 'missing', validInput),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects AI-controlled sheets in Phase 4', async () => {
    sessionFindUnique.mockResolvedValue(dbSession);

    await expect(
      service.createSheet('user-uuid', 'session-uuid', {
        ...validInput,
        aiProvider: 'google',
        aiModel: 'gemini-2.5-flash',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second human sheet in the same session', async () => {
    sessionFindUnique.mockResolvedValue(dbSession);
    sheetCount.mockResolvedValue(1);

    await expect(
      service.createSheet('user-uuid', 'session-uuid', validInput),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('merges an HP patch onto the existing sheet', async () => {
    sheetFindFirst.mockResolvedValue(dbSheet);
    sheetUpdate.mockResolvedValue({ ...dbSheet, hpCurrent: 5 });

    const result = await service.updateSheet('user-uuid', {
      sessionId: 'session-uuid',
      hpCurrent: 5,
    });

    expect(sheetUpdate).toHaveBeenCalledWith({
      where: { id: 'sheet-uuid' },
      data: { hpCurrent: 5 },
    });
    expect(result.hpCurrent).toBe(5);
  });

  it('rejects an update that would push hpCurrent above hpMax', async () => {
    sheetFindFirst.mockResolvedValue(dbSheet);

    await expect(
      service.updateSheet('user-uuid', {
        sessionId: 'session-uuid',
        hpCurrent: 99,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sheetUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFound when the caller has no sheet to update', async () => {
    sheetFindFirst.mockResolvedValue(null);

    await expect(
      service.updateSheet('user-uuid', {
        sessionId: 'session-uuid',
        hpCurrent: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns null from getOwnSheet when none exists', async () => {
    sheetFindFirst.mockResolvedValue(null);

    await expect(
      service.getOwnSheet('user-uuid', 'session-uuid'),
    ).resolves.toBeNull();
  });
});
