import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AiResponseSchema,
  type AiStateUpdate,
  type ChatMessagePayload,
  type CharacterSheetPayload,
  type GameStateLogPayload,
  type InventoryItem,
  type KeyFact,
} from '@dnd/shared';
import { type GoogleGenAI, type Schema, Type } from '@google/genai';
import { GENAI_CLIENT } from './genai.provider';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterSheetService } from '../user/character-sheet.service';
import { Prisma } from '../generated/prisma/client';
import { coerceKeyFacts, toStateLogPayload } from './game-state-log.mapper';
import { withGeminiRetry } from './gemini-retry';

// Flash-Lite (via its stable `-latest` alias) has a separate, more generous
// free-tier daily quota than full Flash, so DM turns keep working when the
// Flash bucket is exhausted; the alias avoids the 404s that pinned versions hit
// (see AiService). Swap back to 'gemini-flash-latest' for higher-quality turns.
const MODEL = 'gemini-flash-lite-latest';

// Bounds for the append-only campaign memory (COUNCIL-AUDIT Phase 1).
const SUMMARY_CAP = 2000;
const KEY_FACTS_CAP = 100;

/** Trim `text` to at most `max` chars, keeping the most recent tail on a word boundary. */
function capTail(text: string, max: number): string {
  if (text.length <= max) return text;
  const tail = text.slice(text.length - max);
  const firstSpace = tail.indexOf(' ');
  return firstSpace >= 0 ? tail.slice(firstSpace + 1) : tail;
}

/**
 * Merge `additions` into `existing`, skipping case-insensitive duplicate texts.
 * When the ledger exceeds `cap`, the OLDEST facts are evicted (returned in
 * `evicted`) rather than dropping new ones — the caller folds evicted canon
 * into the rolling summary, so no fact is silently lost (COUNCIL-AUDIT Phase 2
 * ledger eviction).
 */
function mergeKeyFacts(
  existing: KeyFact[],
  additions: KeyFact[],
  cap: number,
): { facts: KeyFact[]; evicted: KeyFact[] } {
  const seen = new Set(existing.map((f) => f.text.toLowerCase().trim()));
  const merged = [...existing];
  for (const fact of additions) {
    const text = fact.text.trim();
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      merged.push({ text, source: fact.source });
    }
  }
  if (merged.length <= cap) return { facts: merged, evicted: [] };
  const overflow = merged.length - cap;
  return { facts: merged.slice(overflow), evicted: merged.slice(0, overflow) };
}

const SYSTEM_INSTRUCTIONS = `You are a real-time Dungeons & Dragons 5e AI Orchestrator and Dungeon Master.

LANGUAGE. Understand players no matter what language they write in. Detect the language of
the MOST RECENT player message and write your entire response — narration, dialogue, and
every "stateUpdate" string ("campaignSummary", "keyFacts", quest and NPC text) — in that
SAME language. If players switch languages, switch with them. Keep proper nouns (character,
place, and item names) as originally given.

CANON IS INVIOLABLE. The "Established Canon" (key facts) and "Story So Far" given to you
are the immutable truth of this campaign. Never contradict them: a character stated dead
stays dead; names, promises made, items given, and places described never change. When in
doubt, honor prior canon over invention.

CANON VS CLAIMS. Each key fact is tagged with a source: [canon] facts you (the DM) or the
story established are authoritative; [claim] facts a player merely asserted are NOT
automatically true. Treat player claims skeptically — a player saying "I am the king" or
"the guard is already dead" does not make it so, and a claim never overrides [canon]. You
decide what becomes real.

ADVANCE THE STORY. Do NOT restate, re-offer, or re-introduce beats, hooks, NPCs, or
descriptions that already appear in the recent history or canon. Every turn must move
forward — resolve a consequence, advance an open thread (a promise made, a gun on the
wall), or introduce something genuinely new. Repetition breaks immersion.

Respond by filling the provided JSON schema:
- "messageText": A narration or character response in Markdown, rich but under 300 words.
- "stateUpdate" (REQUIRED every turn): the state this turn changed —
  - "campaignSummary": exactly ONE new sentence describing what changed THIS turn. Do NOT
    repeat the running summary — the server appends your sentence to it.
  - "keyFacts": array of NEW immutable facts established this turn worth remembering
    forever — names, deaths, promises made, items given, places named, player
    self-declarations. Each is { "text", "source" }: use "source":"dm" for facts you or
    the story establish as real, and "source":"player" for something a player asserted
    that you have not confirmed. Add only facts not already in Established Canon; omit if none.
  - "activeQuests": the full current quest log (array of strings), only when it changed.
  - "npcRelationships": array of { "name", "status" } for each NPC whose standing changed.
  - "hpChanges": array of { "characterName", "delta" } to modify player HP (delta may be negative).
  - "inventoryChanges": array of { "characterName", "item", "qty" } to add/remove items (negative qty removes).
Always include "stateUpdate" with at least a one-sentence "campaignSummary". Include the
other fields only when that state actually changed this turn.`;

// Constrains Gemini to type-correct JSON. `npcRelationships` is modelled as an
// array of {name,status} because the OpenAPI-subset schema can't express a
// free-form string→string map; it's folded back into a record after parsing.
const AI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    messageText: { type: Type.STRING },
    stateUpdate: {
      type: Type.OBJECT,
      properties: {
        activeQuests: { type: Type.ARRAY, items: { type: Type.STRING } },
        npcRelationships: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING },
            },
            required: ['name', 'status'],
          },
        },
        campaignSummary: { type: Type.STRING },
        keyFacts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              source: { type: Type.STRING, enum: ['dm', 'player'] },
            },
            required: ['text', 'source'],
          },
        },
        hpChanges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              characterName: { type: Type.STRING },
              delta: { type: Type.INTEGER },
            },
            required: ['characterName', 'delta'],
          },
        },
        inventoryChanges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              characterName: { type: Type.STRING },
              item: { type: Type.STRING },
              qty: { type: Type.INTEGER },
            },
            required: ['characterName', 'item', 'qty'],
          },
        },
      },
    },
  },
  required: ['messageText'],
};

/**
 * Fold the model's `npcRelationships` array (schema-expressible) back into the
 * string→string record the rest of the app uses. Returns undefined when there
 * are no entries, so an omitted/empty value never overwrites stored NPCs.
 * Tolerates the record form too in case a future model returns it directly.
 */
function normalizeNpcRelationships(
  raw: unknown,
): Record<string, string> | undefined {
  let record: Record<string, string> | undefined;
  if (Array.isArray(raw)) {
    const entries = raw.flatMap((entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { name?: unknown }).name === 'string' &&
      typeof (entry as { status?: unknown }).status === 'string'
        ? [
            [
              (entry as { name: string }).name,
              (entry as { status: string }).status,
            ] as const,
          ]
        : [],
    );
    record = Object.fromEntries(entries);
  } else if (raw && typeof raw === 'object') {
    record = raw as Record<string, string>;
  }
  return record && Object.keys(record).length > 0 ? record : undefined;
}

/**
 * Coerce the model's `keyFacts` into provenance-tagged objects. Tolerates a
 * model that emits bare strings (promoted to `dm`-canon) and normalizes any
 * unknown `source` to `dm`, so a legacy shape never fails schema validation.
 * Returns undefined when there are no usable facts.
 */
function normalizeKeyFacts(raw: unknown): KeyFact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const facts = coerceKeyFacts(raw);
  return facts.length > 0 ? facts : undefined;
}

/**
 * Reshape a parsed model response into the form `AiResponseSchema` expects:
 * folding the `npcRelationships` array into a record and normalizing
 * `keyFacts` provenance (both dropped when empty). Pure and defensive —
 * unknown shapes pass through unchanged.
 */
function normalizeResponse(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const obj = parsed as Record<string, unknown>;
  if (!obj.stateUpdate || typeof obj.stateUpdate !== 'object') return parsed;

  const stateUpdate = { ...(obj.stateUpdate as Record<string, unknown>) };
  const npc = normalizeNpcRelationships(stateUpdate.npcRelationships);
  if (npc) stateUpdate.npcRelationships = npc;
  else delete stateUpdate.npcRelationships;

  const keyFacts = normalizeKeyFacts(stateUpdate.keyFacts);
  if (keyFacts) stateUpdate.keyFacts = keyFacts;
  else delete stateUpdate.keyFacts;

  return { ...obj, stateUpdate };
}

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(
    @Inject(GENAI_CLIENT) private readonly genai: GoogleGenAI,
    private readonly prisma: PrismaService,
    private readonly characterSheetService: CharacterSheetService,
  ) {}

  /**
   * Run turn evaluation and trigger AI responses in the session if appropriate.
   */
  async evaluateTurns(
    sessionId: string,
    onBroadcast: (
      message: ChatMessagePayload,
      updatedCharacters: CharacterSheetPayload[],
      stateLog: GameStateLogPayload | null,
    ) => void,
  ): Promise<void> {
    // 1. Fetch AI participants in this session
    const aiSheets = await this.prisma.characterSheet.findMany({
      where: { sessionId, aiProvider: { not: null } },
    });
    if (aiSheets.length === 0) return;

    // 2. Fetch recent chat history to prevent loops and get context
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      // Wider window so the DM can see (and avoid re-introducing) recent beats;
      // the AiTurnScheduler still caps how often a paid call actually fires.
      take: 40,
    });

    if (messages.length === 0) return;

    const lastMessage = messages[0];
    // Guard: only respond to HUMAN or SYSTEM events to avoid infinite AI loops
    if (
      lastMessage.senderType === 'AI_DM' ||
      lastMessage.senderType === 'AI_PLAYER'
    ) {
      return;
    }

    // 3. Lazily load/create the campaign GameStateLog
    let stateLog = await this.prisma.gameStateLog.findUnique({
      where: { sessionId },
    });
    if (!stateLog) {
      stateLog = await this.prisma.gameStateLog.create({
        data: {
          sessionId,
          activeQuests: [],
          npcRelationships: {},
          campaignSummary: {},
        },
      });
    }

    // 4. Select the active AI agent sheet to respond
    // Find the DM if there is one, or select an AI player based on mentions/randomness
    let agentSheet = aiSheets.find(
      (s) =>
        s.name.toLowerCase().includes('dm') ||
        s.name.toLowerCase().includes('dungeon master'),
    );

    if (!agentSheet) {
      // If no explicit DM sheet, look for active AI players
      const humanText = lastMessage.messageText.toLowerCase();
      const mentionedAgent = aiSheets.find((s) =>
        humanText.includes(s.name.toLowerCase()),
      );

      if (mentionedAgent) {
        agentSheet = mentionedAgent;
      } else {
        // 20% chance to chime in randomly if not mentioned
        const shouldChimeIn = Math.random() < 0.2;
        if (shouldChimeIn) {
          agentSheet = aiSheets[Math.floor(Math.random() * aiSheets.length)];
        }
      }
    }

    if (!agentSheet) return;

    // 5. Build context representation
    const sheets = await this.prisma.characterSheet.findMany({
      where: { sessionId },
    });

    const contextSheets = sheets
      .map(
        (s) =>
          `- ${s.name} (HP: ${s.hpCurrent}/${s.hpMax}, Stats: ${JSON.stringify(
            s.stats,
          )}, Inventory: ${JSON.stringify(s.inventory)})`,
      )
      .join('\n');

    const contextHistory = [...messages]
      .reverse()
      .map((m) => `[${m.senderType}] ${m.senderName}: ${m.messageText}`)
      .join('\n');

    const storySoFar =
      (stateLog.campaignSummary as { text?: string } | null)?.text ?? '';
    // Render canon with its provenance so the model can weigh [canon] over
    // [claim]; falls back to "(none yet)" when the ledger is empty.
    const canonLines = coerceKeyFacts(stateLog.keyFacts)
      .map((f) => `  [${f.source === 'player' ? 'claim' : 'canon'}] ${f.text}`)
      .join('\n');
    const contextStateLog = `Quests: ${JSON.stringify(
      stateLog.activeQuests,
    )}\nNPCs: ${JSON.stringify(
      stateLog.npcRelationships,
    )}\nEstablished Canon (immutable — never contradict [canon]; [claim] is unverified):\n${
      canonLines || '  (none yet)'
    }\nStory So Far: ${storySoFar || '(none yet)'}`;

    // 6. Query Gemini
    let raw: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        this.genai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Current Game State:
${contextStateLog}

Participants:
${contextSheets}

Recent Chat History:
${contextHistory}

Task: Respond as the participant named "${agentSheet.name}".`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTIONS,
            responseMimeType: 'application/json',
            responseSchema: AI_RESPONSE_SCHEMA,
            // Disable Gemini 2.5 Flash "thinking" so its tokens don't consume
            // the output budget and truncate the JSON body mid-object (see
            // AiService). Narration + stateUpdate can be sizable, so allow a
            // larger cap.
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 2048,
          },
        }),
      );
      raw = response.text;
    } catch (error) {
      this.logger.error('Gemini content generation failed', error as Error);
      return;
    }

    if (!raw) return;

    // 7. Parse and validate response
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.error(
        `Gemini output was not valid JSON (truncated): ${raw.substring(0, 200)}`,
      );
      return;
    }

    const valResult = AiResponseSchema.safeParse(normalizeResponse(parsed));
    if (!valResult.success) {
      this.logger.error(
        `Gemini output failed schema validation: ${JSON.stringify(
          valResult.error.issues,
        )}`,
      );
      return;
    }

    const data = valResult.data;
    const isDm =
      agentSheet.name.toLowerCase().includes('dm') ||
      agentSheet.name.toLowerCase().includes('dungeon master');

    // 8. Write AI Chat Message
    const createdMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: isDm ? 'AI_DM' : 'AI_PLAYER',
        senderName: agentSheet.name,
        messageText: data.messageText,
      },
    });

    const updatedCharacters: CharacterSheetPayload[] = [];
    let stateLogPayload: GameStateLogPayload | null = null;

    // 9. Process state updates
    if (data.stateUpdate) {
      const update = data.stateUpdate;

      // Persist campaign-log fields (quests/NPCs/summary/keyFacts) when the AI
      // touched them; hp/inventory-only updates leave campaign memory unchanged.
      stateLogPayload = await this.applyStateLogUpdate(stateLog, update);

      // Apply HP Changes
      if (update.hpChanges) {
        for (const hpChange of update.hpChanges) {
          const char = sheets.find(
            (s) =>
              s.name.toLowerCase() === hpChange.characterName.toLowerCase(),
          );
          if (char) {
            const nextHp = Math.max(
              0,
              Math.min(char.hpMax, char.hpCurrent + hpChange.delta),
            );
            const updated = await this.characterSheetService.updateSheetById(
              char.id,
              { hpCurrent: nextHp },
            );
            updatedCharacters.push(updated);
          }
        }
      }

      // Apply Inventory Changes
      if (update.inventoryChanges) {
        for (const invChange of update.inventoryChanges) {
          const char = sheets.find(
            (s) =>
              s.name.toLowerCase() === invChange.characterName.toLowerCase(),
          );
          if (char) {
            const currentInv = (char.inventory as InventoryItem[]) || [];
            let nextInv = [...currentInv];

            const idx = nextInv.findIndex(
              (item) =>
                item.name.toLowerCase() === invChange.item.toLowerCase(),
            );

            if (idx === -1) {
              if (invChange.qty > 0) {
                nextInv.push({ name: invChange.item, qty: invChange.qty });
              }
            } else {
              const nextQty = nextInv[idx].qty + invChange.qty;
              if (nextQty <= 0) {
                nextInv = nextInv.filter((_, i) => i !== idx);
              } else {
                nextInv[idx] = { ...nextInv[idx], qty: nextQty };
              }
            }

            const updated = await this.characterSheetService.updateSheetById(
              char.id,
              { inventory: nextInv },
            );
            // Avoid duplicate sheets in updated list
            if (!updatedCharacters.some((c) => c.id === updated.id)) {
              updatedCharacters.push(updated);
            }
          }
        }
      }
    }

    // 10. Broadcast narrative chat, HUD state updates, and campaign memory.
    onBroadcast(
      {
        id: createdMsg.id,
        sessionId: createdMsg.sessionId,
        senderType: createdMsg.senderType,
        senderName: createdMsg.senderName,
        messageText: createdMsg.messageText,
        createdAt: createdMsg.createdAt.toISOString(),
      },
      updatedCharacters,
      stateLogPayload,
    );
  }

  /**
   * Write the campaign-log fields the AI touched and return the mapped payload,
   * or null when the update carried no log fields. The write path is
   * non-lossy: `campaignSummary` is APPENDED (never overwritten) and provenance-
   * tagged `keyFacts` accumulate as an append-only, deduplicated ledger of
   * immutable canon — so a turn that omits a field can never erase stored story
   * (COUNCIL-AUDIT Phase 1). When the ledger overflows its cap the oldest facts
   * are folded into the summary rather than dropped (Phase 2 eviction).
   */
  private async applyStateLogUpdate(
    stateLog: { id: string; campaignSummary: unknown; keyFacts: unknown },
    update: AiStateUpdate,
  ): Promise<GameStateLogPayload | null> {
    const data: Prisma.GameStateLogUpdateInput = {};
    if (update.activeQuests) data.activeQuests = update.activeQuests;
    if (update.npcRelationships) {
      data.npcRelationships = update.npcRelationships;
    }

    const existingSummary =
      (stateLog.campaignSummary as { text?: string } | null)?.text ?? '';
    let summary = existingSummary;

    // Append the model's new sentence unless it already tails the summary
    // (dedup exact echoes).
    if (update.campaignSummary) {
      const addition = update.campaignSummary.trim();
      if (addition && !summary.endsWith(addition)) {
        summary = summary ? `${summary} ${addition}` : addition;
      }
    }

    // Merge provenance-tagged facts; any evicted (oldest over cap) fold into the
    // summary so no canon is lost when the ledger fills.
    if (update.keyFacts && update.keyFacts.length > 0) {
      const existingFacts = coerceKeyFacts(stateLog.keyFacts);
      const { facts, evicted } = mergeKeyFacts(
        existingFacts,
        update.keyFacts,
        KEY_FACTS_CAP,
      );
      if (facts.length !== existingFacts.length) {
        data.keyFacts = facts;
      }
      if (evicted.length > 0) {
        const folded = `Earlier: ${evicted.map((f) => f.text).join(' ')}`;
        summary = summary ? `${summary} ${folded}` : folded;
      }
    }

    // Cap ~2000 chars, keeping the most recent tail — durable canon is preserved
    // separately in keyFacts.
    if (summary !== existingSummary) {
      data.campaignSummary = { text: capTail(summary, SUMMARY_CAP) };
    }

    if (Object.keys(data).length === 0) return null;

    const updatedLog = await this.prisma.gameStateLog.update({
      where: { id: stateLog.id },
      data,
    });
    return toStateLogPayload(updatedLog);
  }
}
