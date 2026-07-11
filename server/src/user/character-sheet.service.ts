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
import type { CharacterSheet } from '../generated/prisma/client';
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
    // Phase 4 persists human sheets only; AI-controlled sheets arrive through
    // a separate path in Phase 5.
    if (input.aiProvider !== null || input.aiModel !== null) {
      throw new BadRequestException(
        'AI character sheets are not supported yet',
      );
    }
    // Decision 1: at most one human-controlled sheet per user per session.
    const existing = await this.prisma.characterSheet.count({
      where: { sessionId, userId, aiProvider: null },
    });
    if (existing > 0) {
      throw new ConflictException(
        'You already have a character in this session',
      );
    }

    const created = await this.prisma.characterSheet.create({
      data: {
        userId,
        sessionId,
        name: input.name,
        hpCurrent: input.hpCurrent,
        hpMax: input.hpMax,
        stats: input.stats,
        inventory: input.inventory,
        aiProvider: null,
        aiModel: null,
      },
    });
    return this.toPayload(created);
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
