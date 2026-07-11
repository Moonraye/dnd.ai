import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ZodValidationPipe());
  // Auth is a Bearer header (no cookies), so we don't need credentialed CORS.
  // When CLIENT_URL is unset (local dev) reflect any origin so localhost vs
  // 127.0.0.1 and alternate ports all work; lock it down via CLIENT_URL in prod.
  app.enableCors({ origin: process.env.CLIENT_URL ?? true });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
