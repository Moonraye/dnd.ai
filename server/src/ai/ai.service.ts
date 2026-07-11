import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CharacterSheetSchema, type CharacterSheetInput } from '@dnd/shared';
import type { GoogleGenAI } from '@google/genai';
import { GENAI_CLIENT } from './genai.provider';

// ADR 4: Gemini. A one-shot draft generator, not an agent — Phase 5 builds
// the orchestration on top of this module.
// `gemini-flash-latest` is a stable alias that tracks the current GA Flash
// model. Pinned versions (e.g. gemini-2.5-flash) get restricted to
// "no longer available to new users" over time, which 404s the call.
const MODEL = 'gemini-flash-latest';

const SCHEMA_INSTRUCTIONS = `You generate D&D 5e characters. Respond with ONLY a JSON object of this exact shape:
{
  "name": string (1-50 chars),
  "hpCurrent": integer >= 0 and <= hpMax,
  "hpMax": integer >= 1,
  "stats": { "str": int, "dex": int, "con": int, "int": int, "wis": int, "cha": int } each 1-30,
  "inventory": [ { "name": string, "qty": integer >= 1 } ]
}
Do not include any other fields, commentary, or markdown. Concept: `;

const DRAFT_FAILED = 'AI draft failed — try again or fill the form manually';

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
      const response = await this.genai.models.generateContent({
        model: MODEL,
        contents: `${SCHEMA_INSTRUCTIONS}${prompt}`,
        config: { responseMimeType: 'application/json' },
      });
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
        `Gemini response was not valid JSON: ${raw}`,
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
        `Gemini draft failed schema validation: ${JSON.stringify(result.error.issues)} — raw: ${raw}`,
      );
      throw new BadGatewayException(DRAFT_FAILED);
    }
    return result.data;
  }
}
