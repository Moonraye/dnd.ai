import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AiResponseSchema,
  isDungeonMasterSheet,
  type AiStateUpdate,
  type ChatMessagePayload,
  type CharacterSheetPayload,
  type DiceRollMetadata,
  type GameStateLogPayload,
  type InventoryItem,
  type KeyFact,
  type Language,
} from '@dnd/shared';
import { type GoogleGenAI, type Schema, Type } from '@google/genai';
import { GENAI_CLIENT } from './genai.provider';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterSheetService } from '../user/character-sheet.service';
import { Prisma } from '../generated/prisma/client';
import type {
  ChatMessage,
  ChatVisibility,
  CharacterSheet,
} from '../generated/prisma/client';
import { coerceKeyFacts, toStateLogPayload } from './game-state-log.mapper';
import { withGeminiRetry } from './gemini-retry';
import { DiceService } from '../game-session/dice.service';

// Flash-Lite (via its stable `-latest` alias) has a separate, more generous
// free-tier daily quota than full Flash, so DM turns keep working when the
// Flash bucket is exhausted; the alias avoids the 404s that pinned versions hit
// (see AiService). Swap back to 'gemini-flash-latest' for higher-quality turns.
const MODEL = 'gemini-flash-lite-latest';

// Bounds for the append-only campaign memory (COUNCIL-AUDIT Phase 1).
const SUMMARY_CAP = 2000;
const KEY_FACTS_CAP = 100;

// Client-side abort for stalled upstream calls; withGeminiRetry only fires
// once a request rejects, so without this a hung request blocks the turn
// pipeline indefinitely.
const GEMINI_TIMEOUT_MS = 30_000;

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

// Human-readable names for the LANGUAGE paragraph below.
const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  uk: 'Ukrainian',
};

/**
 * The session's language (chosen once at lobby creation, immutable
 * thereafter) pins the response language for the whole turn, regardless of
 * what language players type in chat.
 */
function buildLanguageParagraph(language: Language): string {
  // The column is an unconstrained String in Prisma; guard against a bad
  // value ever reaching the prompt via a future write path or manual edit.
  const name = LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en;
  return `LANGUAGE. This campaign's language is ${name}. Understand players no matter what
language they write in, but write your ENTIRE response — narration, dialogue, and every
"stateUpdate" string ("campaignSummary", "keyFacts", quest and NPC text) — in ${name},
regardless of what language players write in the chat. Keep proper nouns (character, place,
and item names) as originally given.`;
}

/** Assembles the system prompt, pinned to the session's language. */
function buildSystemInstructions(language: Language): string {
  const languageParagraph = buildLanguageParagraph(language);

  return `You are a real-time Dungeons & Dragons 5e AI Orchestrator and Dungeon Master.

${languageParagraph}

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
}

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
    diceRolls: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characterName: { type: Type.STRING },
          notation: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['characterName', 'notation', 'reason'],
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
    private readonly diceService: DiceService,
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
    ) => void | Promise<void>,
    forceAgentId?: string,
    // The session's language (chosen once at lobby creation, immutable
    // thereafter). Every session has one (defaults to 'en' in the DB), so
    // the caller always resolves and passes it explicitly.
    language: Language = 'en',
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
    // Guard: allow at most 1 hop of AI-to-AI responses (banter) before halting,
    // to avoid infinite loops, unless explicitly forced.
    if (!forceAgentId) {
      const isLastMessageAi =
        lastMessage.senderType === 'AI_DM' ||
        lastMessage.senderType === 'AI_PLAYER';

      if (isLastMessageAi) {
        const secondLastMessage = messages[1];
        const isSecondLastMessageAi =
          secondLastMessage &&
          (secondLastMessage.senderType === 'AI_DM' ||
            secondLastMessage.senderType === 'AI_PLAYER');

        if (isSecondLastMessageAi) {
          // Stop: 2 consecutive AI responses have already occurred.
          return;
        }
      }
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
    let agentSheet: CharacterSheet | undefined;
    if (forceAgentId) {
      agentSheet = aiSheets.find((s) => s.id === forceAgentId);
    } else {
      // Shared word-bounded heuristic (see session-limits.ts) so the DM pick
      // and the role caps can never disagree on who the DM is.
      agentSheet = aiSheets.find((s) => isDungeonMasterSheet(s));

      if (!agentSheet) {
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
    }

    if (!agentSheet) return;

    // 5. Build context representation
    const sheets = await this.prisma.characterSheet.findMany({
      where: { sessionId },
    });

    const contextSheets = sheets
      .map((s) => {
        const personaPart = s.persona ? `, Persona: ${s.persona}` : '';
        return `- ${s.name} (HP: ${s.hpCurrent}/${s.hpMax}, Stats: ${JSON.stringify(
          s.stats,
        )}, Inventory: ${JSON.stringify(s.inventory)}${personaPart})`;
      })
      .join('\n');

    const contextHistory = [...messages]
      .reverse()
      .map((m) => {
        let text = m.messageText;
        if (m.visibility === 'WHISPER') {
          const isParticipant =
            m.senderCharacterId === agentSheet.id ||
            m.recipientCharacterId === agentSheet.id;
          if (!isParticipant) {
            text = `${m.senderName} whispers to ${m.recipientName ?? 'someone'}...`;
          }
        }
        return `[${m.senderType}] ${m.senderName}: ${text}`;
      })
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

Task: Respond as the participant named "${agentSheet.name}".${
                    agentSheet.persona
                      ? `\nYour Persona: ${agentSheet.persona}\nYou MUST stay in character and speak in the exact voice, tone, and personality described by this persona.`
                      : ''
                  }`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: buildSystemInstructions(language),
            responseMimeType: 'application/json',
            responseSchema: AI_RESPONSE_SCHEMA,
            // Disable Gemini 2.5 Flash "thinking" so its tokens don't consume
            // the output budget and truncate the JSON body mid-object (see
            // AiService). Narration + stateUpdate can be sizable, so allow a
            // larger cap.
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 2048,
            httpOptions: { timeout: GEMINI_TIMEOUT_MS },
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
    const isDm = isDungeonMasterSheet(agentSheet);

    // Determine if AI's reply should be a whisper
    let visibility: ChatVisibility = 'PUBLIC';
    let recipientUserId: string | null = null;
    let recipientCharacterId: string | null = null;
    let recipientName: string | null = null;

    if (
      lastMessage.visibility === 'WHISPER' &&
      lastMessage.recipientCharacterId === agentSheet.id
    ) {
      visibility = 'WHISPER';
      recipientUserId = lastMessage.senderUserId;
      recipientCharacterId = lastMessage.senderCharacterId;
      recipientName = lastMessage.senderName;
    }

    // 8. Write AI Chat Message
    const createdMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: isDm ? 'AI_DM' : 'AI_PLAYER',
        senderName: agentSheet.name,
        messageText: data.messageText,
        visibility,
        senderCharacterId: agentSheet.id,
        recipientUserId,
        recipientCharacterId,
        recipientName,
      },
    });

    // Execute AI-initiated dice rolls
    const rolledMessages: ChatMessage[] = [];
    if (data.diceRolls && data.diceRolls.length > 0) {
      for (const roll of data.diceRolls) {
        try {
          const rollResult = this.diceService.roll(
            roll.notation,
            roll.characterName,
          );
          const rollMsg = await this.prisma.chatMessage.create({
            data: {
              sessionId,
              senderType: 'SYSTEM',
              senderName: roll.characterName,
              messageText: rollResult.messageText,
              visibility: 'PUBLIC',
              metadata: rollResult.metadata as unknown as Prisma.InputJsonValue,
            },
          });
          rolledMessages.push(rollMsg);
        } catch (error) {
          this.logger.warn(
            `AI-initiated dice roll failed for notation "${roll.notation}": ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    const updatedCharacters: CharacterSheetPayload[] = [];
    let stateLogPayload: GameStateLogPayload | null = null;

    // 9. Process state updates. Wrapped in try/catch so a failure here
    // (state-log or sheet write) can never swallow the broadcast below — the
    // persisted AI message and every write that DID commit are always emitted,
    // keeping clients in sync with the database even when a later write fails.
    try {
      if (data.stateUpdate) {
        let update = data.stateUpdate;
        if (!isDm) {
          // Non-DM companions can only update their own relationship key,
          // and cannot touch quests, campaign summary, or canon keyFacts.
          const filteredRels: Record<string, string> = {};
          if (update.npcRelationships) {
            const agentNameLower = agentSheet.name.toLowerCase();
            for (const [key, val] of Object.entries(update.npcRelationships)) {
              if (key.toLowerCase() === agentNameLower) {
                filteredRels[key] = val;
              }
            }
          }
          update = {
            ...update,
            activeQuests: undefined,
            campaignSummary: undefined,
            keyFacts: undefined,
            npcRelationships:
              Object.keys(filteredRels).length > 0 ? filteredRels : undefined,
          };
        }

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
    } catch (error) {
      this.logger.error(
        'State update failed after the AI message was persisted; broadcasting committed state',
        error as Error,
      );
    }

    // 10. Broadcast narrative chat, HUD state updates, and campaign memory.
    // Fire-and-forget: the gateway's broadcast callback may be async (e.g. to
    // resolve whisper recipients), but evaluateTurns doesn't need to wait on it.
    void onBroadcast(
      {
        id: createdMsg.id,
        sessionId: createdMsg.sessionId,
        senderType: createdMsg.senderType,
        senderName: createdMsg.senderName,
        messageText: createdMsg.messageText,
        createdAt: createdMsg.createdAt.toISOString(),
        visibility: createdMsg.visibility,
        recipientId:
          createdMsg.recipientCharacterId || createdMsg.recipientUserId || null,
        recipientName: createdMsg.recipientName,
      },
      updatedCharacters,
      stateLogPayload,
    );

    // Broadcast rolled cards as separate events
    for (const rollMsg of rolledMessages) {
      void onBroadcast(
        {
          id: rollMsg.id,
          sessionId: rollMsg.sessionId,
          senderType: rollMsg.senderType,
          senderName: rollMsg.senderName,
          messageText: rollMsg.messageText,
          createdAt: rollMsg.createdAt.toISOString(),
          visibility: rollMsg.visibility,
          metadata: rollMsg.metadata as unknown as DiceRollMetadata | null,
          recipientId:
            rollMsg.recipientCharacterId || rollMsg.recipientUserId || null,
          recipientName: rollMsg.recipientName,
        },
        [],
        null,
      );
    }
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
    // Skip empty arrays like the other state fields: a model-emitted `[]`
    // must never wipe the stored quest log (non-lossy memory).
    if (update.activeQuests && update.activeQuests.length > 0) {
      data.activeQuests = update.activeQuests;
    }
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
