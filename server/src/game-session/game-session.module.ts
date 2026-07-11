import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { CharacterSheetController } from './character-sheet.controller';
import { DiceService } from './dice.service';
import { GameSessionController } from './game-session.controller';
import { GameSessionGateway } from './game-session.gateway';
import { GameSessionService } from './game-session.service';

import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuthModule, UserModule, AiModule],
  controllers: [GameSessionController, CharacterSheetController],
  providers: [GameSessionService, GameSessionGateway, DiceService],
})
export class GameSessionModule {}
