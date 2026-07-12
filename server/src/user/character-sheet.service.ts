import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AbilityScores,
  CharacterSheetInput,
  CharacterSheetPayload,
  InventoryItem,
  UpdateCharacterSheetInput,
} from '@dnd/shared';
import {
  MAX_DMS_PER_SESSION,
  MAX_PLAYERS_PER_SESSION,
  countSessionRoles,
  isDungeonMasterSheet,
} from '@dnd/shared';
import { Prisma, type CharacterSheet } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CharacterSheetService {
  constructor(private readonly prisma: PrismaService) {}

  async createSheet(
    userId: string,
    sessionId: string,
    input: CharacterSheetInput,
  ): Promise<CharacterSheetPayload> {
    const session = await this.prisma.campaignSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const isAi = input.aiProvider !== null || input.aiModel !== null;

    // Enforce the per-session role caps: one AI Dungeon Master and a party of
    // up to MAX_PLAYERS_PER_SESSION non-DM sheets (humans + AI companions).
    const incomingIsDm = isDungeonMasterSheet({
      name: input.name,
      aiProvider: input.aiProvider,
    });
    const sheets = await this.prisma.characterSheet.findMany({
      where: { sessionId },
      select: { name: true, aiProvider: true },
    });
    const { dms, players } = countSessionRoles(sheets);
    if (incomingIsDm) {
      if (dms >= MAX_DMS_PER_SESSION) {
        throw new ConflictException(
          'This session already has a Dungeon Master',
        );
      }
    } else if (players >= MAX_PLAYERS_PER_SESSION) {
      throw new ConflictException(
        `This session is full (max ${MAX_PLAYERS_PER_SESSION} players)`,
      );
    }

    if (!isAi) {
      // Decision 1: at most one human-controlled sheet per user per session.
      const existing = await this.prisma.characterSheet.count({
        where: { sessionId, userId, aiProvider: null },
      });
      if (existing > 0) {
        throw new ConflictException(
          'You already have a character in this session',
        );
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (!isAi) {
          await tx.sessionMember.upsert({
            where: {
              userId_sessionId: { userId, sessionId },
            },
            create: { userId, sessionId },
            update: {},
          });
        }

        return tx.characterSheet.create({
          data: {
            userId: isAi ? null : userId,
            sessionId,
            name: input.name,
            hpCurrent: input.hpCurrent,
            hpMax: input.hpMax,
            stats: input.stats,
            inventory: input.inventory,
            aiProvider: input.aiProvider,
            aiModel: input.aiModel,
          },
        });
      });
      return this.toPayload(created);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already have a character in this session',
        );
      }
      throw error;
    }
  }

  async updateSheet(
    userId: string,
    patch: UpdateCharacterSheetInput,
  ): Promise<CharacterSheetPayload> {
    // findFirst on (sessionId, userId, human) makes this owner-only by
    // construction: a user can only ever match their own sheet.
    const sheet = await this.prisma.characterSheet.findFirst({
      where: { sessionId: patch.sessionId, userId, aiProvider: null },
    });
    if (!sheet) {
      throw new NotFoundException('No character to update in this session');
    }

    const hpMax = patch.hpMax ?? sheet.hpMax;
    const hpCurrent = patch.hpCurrent ?? sheet.hpCurrent;
    if (hpCurrent > hpMax) {
      throw new BadRequestException('hpCurrent cannot exceed hpMax');
    }

    const updated = await this.prisma.characterSheet.update({
      where: { id: sheet.id },
      data: {
        ...(patch.hpCurrent !== undefined && { hpCurrent: patch.hpCurrent }),
        ...(patch.hpMax !== undefined && { hpMax: patch.hpMax }),
        ...(patch.inventory !== undefined && {
          inventory: patch.inventory,
        }),
      },
    });
    return this.toPayload(updated);
  }

  async getOwnSheet(
    userId: string,
    sessionId: string,
  ): Promise<CharacterSheetPayload | null> {
    const sheet = await this.prisma.characterSheet.findFirst({
      where: { sessionId, userId, aiProvider: null },
    });
    return sheet ? this.toPayload(sheet) : null;
  }

  async listSessionSheets(sessionId: string): Promise<CharacterSheetPayload[]> {
    const sheets = await this.prisma.characterSheet.findMany({
      where: { sessionId },
      orderBy: { name: 'asc' },
    });
    return sheets.map((sheet) => this.toPayload(sheet));
  }

  async updateSheetById(
    id: string,
    data: {
      hpCurrent?: number;
      hpMax?: number;
      inventory?: InventoryItem[];
    },
  ): Promise<CharacterSheetPayload> {
    const updated = await this.prisma.characterSheet.update({
      where: { id },
      data: {
        ...(data.hpCurrent !== undefined && { hpCurrent: data.hpCurrent }),
        ...(data.hpMax !== undefined && { hpMax: data.hpMax }),
        ...(data.inventory !== undefined && {
          inventory: data.inventory as unknown as Prisma.InputJsonValue,
        }),
      },
    });
    return this.toPayload(updated);
  }

  private toPayload(sheet: CharacterSheet): CharacterSheetPayload {
    return {
      id: sheet.id,
      userId: sheet.userId,
      sessionId: sheet.sessionId,
      name: sheet.name,
      hpCurrent: sheet.hpCurrent,
      hpMax: sheet.hpMax,
      stats: sheet.stats as AbilityScores,
      inventory: sheet.inventory as InventoryItem[],
      aiProvider: sheet.aiProvider,
      aiModel: sheet.aiModel,
    };
  }
}
