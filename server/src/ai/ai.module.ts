import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { genAiProvider } from './genai.provider';

// UserModule is imported alongside AuthModule because SupabaseAuthGuard
// depends on UserProvisioningService, which AuthModule does not re-export
// (same pattern as GameSessionModule).
@Module({
  imports: [AuthModule, UserModule],
  controllers: [AiController],
  providers: [AiService, genAiProvider],
})
export class AiModule {}
