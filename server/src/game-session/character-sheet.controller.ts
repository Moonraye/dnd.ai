import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { WS_EVENTS, type CharacterSheetPayload } from '@dnd/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { User } from '../generated/prisma/client';
import { CharacterSheetService } from '../user/character-sheet.service';
import { CharacterSheetDto } from './dto/character-sheet.dto';
import { GameSessionGateway, sessionRoom } from './game-session.gateway';

// ADR 1: sheet creation is out-of-game setup, so it lives on REST. Lives in
// game-session (not user) because AuthModule already imports UserModule — a
// controller in user/ that needs the gateway would create a module cycle.
@Controller('sessions/:sessionId/characters')
@UseGuards(SupabaseAuthGuard)
export class CharacterSheetController {
  constructor(
    private readonly characterSheetService: CharacterSheetService,
    private readonly gateway: GameSessionGateway,
  ) {}

  @Post()
  async createSheet(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
    @Body() dto: CharacterSheetDto,
  ): Promise<CharacterSheetPayload> {
    const sheet = await this.characterSheetService.createSheet(
      user.id,
      sessionId,
      dto,
    );
    // Live-update the party strip for players already joined to the room.
    this.gateway.server
      .to(sessionRoom(sessionId))
      .emit(WS_EVENTS.CHARACTER_UPDATED, sheet);
    return sheet;
  }
}
