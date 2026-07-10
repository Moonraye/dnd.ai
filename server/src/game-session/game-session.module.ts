import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { GameSessionController } from './game-session.controller';
import { GameSessionGateway } from './game-session.gateway';
import { GameSessionService } from './game-session.service';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [GameSessionController],
  providers: [GameSessionService, GameSessionGateway],
})
export class GameSessionModule {}
