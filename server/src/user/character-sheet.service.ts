import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AbilityScores,
  CharacterSheetInput,
  CharacterSheetPayload,
  InventoryItem,
  UpdateCharacterSheetInput,
  EditCharacterSheetInput,
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
    const incomingIsDm = isDungeonMasterSheet({
      name: input.name,
      aiProvider: input.aiProvider,
    });

    // The role-cap check runs INSIDE the write transaction at Serializable
    // isolation: there is no DB constraint backing the 1-DM/5-player caps, so
    // a count-then-insert outside the transaction would let two concurrent
    // creates both pass and persist past the cap. Serialization conflicts
    // (P2034) are retried a couple of times before surfacing.
    for (let attempt = 1; ; attempt++) {
      try {
        const created = await this.prisma.$transaction(
          async (tx) => {
            // Enforce the per-session role caps: one AI Dungeon Master and a
            // party of up to MAX_PLAYERS_PER_SESSION non-DM sheets (humans +
            // AI companions).
            const sheets = await tx.characterSheet.findMany({
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
              const existing = await tx.characterSheet.count({
                where: { sessionId, userId, aiProvider: null },
              });
              if (existing > 0) {
                throw new ConflictException(
                  'You already have a character in this session',
                );
              }
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
                ownerId: isAi ? userId : null,
                sessionId,
                name: input.name,
                hpCurrent: input.hpCurrent,
                hpMax: input.hpMax,
                stats: input.stats,
                inventory: input.inventory,
                aiProvider: input.aiProvider,
                aiModel: input.aiModel,
                persona: input.persona,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return this.toPayload(created);
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: unknown }).code
            : undefined;
        if (code === 'P2002') {
          throw new ConflictException(
            'You already have a character in this session',
          );
        }
        if (code === 'P2034' && attempt < 3) continue;
        throw error;
      }
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

  async updateCompanionSheet(
    userId: string,
    sessionId: string,
    sheetId: string,
    patch: EditCharacterSheetInput,
  ): Promise<CharacterSheetPayload> {
    const sheet = await this.prisma.characterSheet.findUnique({
      where: { id: sheetId },
    });
    if (!sheet) {
      throw new NotFoundException(`Character sheet ${sheetId} not found`);
    }
    if (sheet.sessionId !== sessionId) {
      throw new BadRequestException(`Character does not belong to session ${sessionId}`);
    }

    const session = await this.prisma.campaignSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (sheet.userId !== null) {
      throw new ForbiddenException('Human characters cannot be edited via this endpoint');
    }

    const isDm = isDungeonMasterSheet({ name: sheet.name, aiProvider: sheet.aiProvider });

    if (isDm) {
      if (session.creatorId !== userId) {
        throw new ForbiddenException('Only the session host can manage the Dungeon Master');
      }
    } else {
      if (session.creatorId !== userId && sheet.ownerId !== userId) {
        throw new ForbiddenException('You do not have permission to manage this character');
      }
    }

    const hpMax = patch.hpMax ?? sheet.hpMax;
    const hpCurrent = patch.hpCurrent ?? sheet.hpCurrent;
    if (hpCurrent > hpMax) {
      throw new BadRequestException('hpCurrent cannot exceed hpMax');
    }

    const newName = patch.name ?? sheet.name;
    const sheets = await this.prisma.characterSheet.findMany({
      where: { sessionId },
    });
    const updatedSheets = sheets.map((s) => {
      if (s.id === sheet.id) {
        return {
          ...s,
          name: newName,
          aiProvider: sheet.aiProvider,
        };
      }
      return s;
    });
    const { dms, players } = countSessionRoles(updatedSheets);
    if (dms > MAX_DMS_PER_SESSION) {
      throw new ConflictException('This session already has a Dungeon Master');
    }
    if (players > MAX_PLAYERS_PER_SESSION) {
      throw new ConflictException(`This session is full (max ${MAX_PLAYERS_PER_SESSION} players)`);
    }

    const updated = await this.prisma.characterSheet.update({
      where: { id: sheetId },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.persona !== undefined && { persona: patch.persona }),
        ...(patch.hpCurrent !== undefined && { hpCurrent: patch.hpCurrent }),
        ...(patch.hpMax !== undefined && { hpMax: patch.hpMax }),
        ...(patch.stats !== undefined && { stats: patch.stats }),
        ...(patch.inventory !== undefined && {
          inventory: patch.inventory as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    return this.toPayload(updated);
  }

  async deleteCompanionSheet(
    userId: string,
    sessionId: string,
    sheetId: string,
  ): Promise<{ id: string; name: string }> {
    const sheet = await this.prisma.characterSheet.findUnique({
      where: { id: sheetId },
    });
    if (!sheet) {
      throw new NotFoundException(`Character sheet ${sheetId} not found`);
    }
    if (sheet.sessionId !== sessionId) {
      throw new BadRequestException(`Character does not belong to session ${sessionId}`);
    }

    const session = await this.prisma.campaignSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (sheet.userId !== null) {
      throw new ForbiddenException('Human characters cannot be deleted');
    }

    const isDm = isDungeonMasterSheet({ name: sheet.name, aiProvider: sheet.aiProvider });

    if (isDm) {
      if (session.creatorId !== userId) {
        throw new ForbiddenException('Only the session host can manage the Dungeon Master');
      }
    } else {
      if (session.creatorId !== userId && sheet.ownerId !== userId) {
        throw new ForbiddenException('You do not have permission to manage this character');
      }
    }

    await this.prisma.characterSheet.delete({
      where: { id: sheetId },
    });

    return { id: sheet.id, name: sheet.name };
  }

  private toPayload(sheet: CharacterSheet): CharacterSheetPayload {
    return {
      id: sheet.id,
      userId: sheet.userId,
      ownerId: sheet.ownerId,
      sessionId: sheet.sessionId,
      name: sheet.name,
      hpCurrent: sheet.hpCurrent,
      hpMax: sheet.hpMax,
      stats: sheet.stats as AbilityScores,
      inventory: sheet.inventory as InventoryItem[],
      aiProvider: sheet.aiProvider,
      aiModel: sheet.aiModel,
      persona: sheet.persona,
    };
  }
}
