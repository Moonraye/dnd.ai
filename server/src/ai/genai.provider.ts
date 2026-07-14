import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

// Injection token for the Gemini client, mirroring TOKEN_VERIFIER so specs
// can supply a fake without touching the network.
export const GENAI_CLIENT = Symbol('GENAI_CLIENT');

export const genAiProvider: Provider = {
  provide: GENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): GoogleGenAI =>
    new GoogleGenAI({ apiKey: config.getOrThrow<string>('GEMINI_API_KEY') }),
};
