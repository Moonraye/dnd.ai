import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // SEC-2: secure Express headers with helmet
  app.use(helmet());
  
  app.useGlobalPipes(new ZodValidationPipe());
  
  // SEC-4: Fail closed on CORS in production if CLIENT_URL is missing
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL environment variable must be set in production!');
  }
  
  // Auth is a Bearer header (no cookies), so we don't need credentialed CORS.
  // When CLIENT_URL is unset (local dev) reflect any origin so localhost vs
  // 127.0.0.1 and alternate ports all work; lock it down via CLIENT_URL in prod.
  app.enableCors({ origin: process.env.CLIENT_URL ?? true });
  
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
