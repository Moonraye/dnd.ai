import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
