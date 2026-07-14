import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiTurnScheduler } from './ai-turn-scheduler.service';
import { genAiProvider } from './genai.provider';
import { DiceService } from '../game-session/dice.service';

// UserModule is imported alongside AuthModule because SupabaseAuthGuard
// depends on UserProvisioningService, which AuthModule does not re-export
// (same pattern as GameSessionModule).
@Module({
  imports: [AuthModule, UserModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiOrchestrationService,
    AiTurnScheduler,
    genAiProvider,
    DiceService,
  ],
  exports: [AiOrchestrationService, AiTurnScheduler],
})
export class AiModule {}
