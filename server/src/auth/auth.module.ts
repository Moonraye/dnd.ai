import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { TOKEN_VERIFIER } from './token-verifier.interface';
import { Hs256TokenVerifier } from './verifiers/hs256-token.verifier';
import { JwksTokenVerifier } from './verifiers/jwks-token.verifier';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    SupabaseAuthGuard,
    {
      provide: TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');
        if (jwtSecret && !jwtSecret.startsWith('REPLACE_WITH')) {
          return new Hs256TokenVerifier(jwtSecret);
        }
        const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
        return new JwksTokenVerifier(supabaseUrl);
      },
    },
  ],
  exports: [SupabaseAuthGuard, TOKEN_VERIFIER],
})
export class AuthModule {}
