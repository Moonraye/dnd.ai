import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { SessionSummary } from '@dnd/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { User } from '../generated/prisma/client';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { GameSessionService } from './game-session.service';

// ADR 1: out-of-game setup actions (lobby creation/browsing) stay on REST.
@Controller('sessions')
@UseGuards(SupabaseAuthGuard)
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  createLobby(
    @CurrentUser() user: User,
    @Body() dto: CreateLobbyDto,
  ): Promise<SessionSummary> {
    return this.gameSessionService.createLobby(user.id, dto);
  }

  @Get()
  listLobbies(): Promise<SessionSummary[]> {
    return this.gameSessionService.listLobbies();
  }

  @Get(':id')
  getSession(@Param('id') id: string): Promise<SessionSummary> {
    return this.gameSessionService.getSession(id);
  }
}
