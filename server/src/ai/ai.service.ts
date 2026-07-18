import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CharacterSheetSchema, type CharacterSheetInput } from '@dnd/shared';
import { type GoogleGenAI, type Schema, Type } from '@google/genai';
import { GENAI_CLIENT } from './genai.provider';
import { withGeminiRetry } from './gemini-retry';

// ADR 4: Gemini. A one-shot draft generator, not an agent — Phase 5 builds
// the orchestration on top of this module.
// `gemini-flash-lite-latest` is a stable alias tracking the current GA
// Flash-Lite model. Pinned versions (e.g. gemini-2.5-flash) get restricted to
// "no longer available to new users" over time, which 404s the call, so we
// stay on a `-latest` alias. Flash-Lite has its own separate free-tier daily
// quota bucket from full Flash — swap to 'gemini-flash-latest' for richer drafts.
const MODEL = 'gemini-flash-lite-latest';

const DRAFT_FAILED = 'AI draft failed — try again or fill the form manually';

// Client-side abort for stalled upstream calls; withGeminiRetry only fires
// once a request rejects, so without this a hung request blocks forever.
const GEMINI_TIMEOUT_MS = 30_000;

// Constrains the model to emit type-correct JSON of exactly this shape, so the
// response always parses. Numeric ranges stay in the Zod re-validation below —
// responseSchema guarantees structure, CharacterSheetSchema guarantees bounds.
const DRAFT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    hpCurrent: { type: Type.INTEGER },
    hpMax: { type: Type.INTEGER },
    stats: {
      type: Type.OBJECT,
      properties: {
        str: { type: Type.INTEGER },
        dex: { type: Type.INTEGER },
        con: { type: Type.INTEGER },
        int: { type: Type.INTEGER },
        wis: { type: Type.INTEGER },
        cha: { type: Type.INTEGER },
      },
      required: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    },
    inventory: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          qty: { type: Type.INTEGER },
        },
        required: ['name', 'qty'],
      },
    },
  },
  required: ['name', 'hpCurrent', 'hpMax', 'stats', 'inventory'],
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(GENAI_CLIENT) private readonly genai: GoogleGenAI) {}

  /**
   * Turn a free-text concept into a validated draft sheet. Never persists —
   * the caller reviews and saves through the normal manual path (decision 3).
   */
  async generateCharacterDraft(prompt: string): Promise<CharacterSheetInput> {
    let raw: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        this.genai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            systemInstruction:
              'You generate D&D 5e characters. Fill the provided schema with sensible values: ability scores 1-30, hpMax >= 1, hpCurrent between 0 and hpMax.',
            responseMimeType: 'application/json',
            responseSchema: DRAFT_RESPONSE_SCHEMA,
            // gemini-flash-latest (Gemini 2.5 Flash) enables "thinking" by
            // default, and those tokens count against maxOutputTokens — leaving
            // too few for the JSON body, which then truncates mid-object and
            // fails JSON.parse. Disable thinking (unnecessary for schema-shaped
            // extraction) and give the body ample room.
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 2048,
            httpOptions: { timeout: GEMINI_TIMEOUT_MS },
          },
        }),
      );
      raw = response.text;
    } catch (error) {
      this.logger.error('Gemini generateContent call failed', error as Error);
      throw new BadGatewayException(DRAFT_FAILED);
    }
    if (!raw) {
      this.logger.error('Gemini returned an empty response body');
      throw new BadGatewayException(DRAFT_FAILED);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.logger.error(
        `Gemini response was not valid JSON (truncated): ${raw.substring(0, 200)}`,
        error as Error,
      );
      throw new BadGatewayException(DRAFT_FAILED);
    }

    // Force human ownership: the AI must never mark its own draft as
    // AI-controlled (that path is reserved for Phase 5).
    const candidate = {
      ...(parsed as Record<string, unknown>),
      aiProvider: null,
      aiModel: null,
    };
    const result = CharacterSheetSchema.safeParse(candidate);
    if (!result.success) {
      this.logger.error(
        `Gemini draft failed schema validation: ${JSON.stringify(
          result.error.issues,
        )} — raw (truncated): ${raw.substring(0, 200)}`,
      );
      throw new BadGatewayException(DRAFT_FAILED);
    }
    return result.data;
  }
}
