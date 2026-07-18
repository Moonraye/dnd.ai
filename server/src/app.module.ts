import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './http-throttler.guard';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GameSessionModule } from './game-session/game-session.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // A single global throttler. Named throttlers in this array apply to EVERY
    // route, so a strict "ai" limit here would (and did) throttle unrelated
    // setup calls like spawning characters. Instead, keep one generous global
    // limit and let AI routes tighten it locally with @Throttle (see
    // AiController). ttl is in ms.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    UserModule,
    AuthModule,
    GameSessionModule,
    AiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
  ],
})
export class AppModule {}
