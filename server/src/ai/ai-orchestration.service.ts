import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AiResponseSchema,
  type ChatMessagePayload,
  type CharacterSheetPayload,
  type InventoryItem,
} from '@dnd/shared';
import type { GoogleGenAI } from '@google/genai';
import { GENAI_CLIENT } from './genai.provider';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterSheetService } from '../user/character-sheet.service';
import { Prisma } from '../generated/prisma/client';

const MODEL = 'gemini-flash-latest';

const SYSTEM_INSTRUCTIONS = `You are a real-time Dungeons & Dragons 5e AI Orchestrator.
You must respond with ONLY a JSON object containing:
1. "messageText": A narration or character response in Markdown. Keep it rich but under 300 words.
2. "stateUpdate": An optional object containing state mutations:
   - "activeQuests": Array of strings (the current quest log).
   - "npcRelationships": Object mapping NPC names to relationship status or details.
   - "campaignSummary": String summarizing the story so far.
   - "hpChanges": Array of { "characterName": string, "delta": number } to modify player HP (delta can be positive or negative).
   - "inventoryChanges": Array of { "characterName": string, "item": string, "qty": number } to add/remove items (negative quantity removes/decreases items).

JSON Schema to follow exactly:
{
  "messageText": "string",
  "stateUpdate": {
    "activeQuests": ["string"],
    "npcRelationships": { "string": "string" },
    "campaignSummary": "string",
    "hpChanges": [
      { "characterName": "string", "delta": number }
    ],
    "inventoryChanges": [
      { "characterName": "string", "item": "string", "qty": number }
    ]
  }
}
Do not include any commentary, formatting blocks other than standard JSON, or markdown outside of the messageText.`;

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
      take: 15,
    });

    if (messages.length === 0) return;

    const lastMessage = messages[0];
    // Guard: only respond to HUMAN or SYSTEM events to avoid infinite AI loops
    if (lastMessage.senderType === 'AI_DM' || lastMessage.senderType === 'AI_PLAYER') {
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

    const contextStateLog = `Quests: ${JSON.stringify(
      stateLog.activeQuests,
    )}\nNPCs: ${JSON.stringify(
      stateLog.npcRelationships,
    )}\nSummary: ${JSON.stringify(stateLog.campaignSummary)}`;

    // 6. Query Gemini
    let raw: string | undefined;
    try {
      const response = await this.genai.models.generateContent({
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
          maxOutputTokens: 1000,
        },
      });
      raw = response.text;
    } catch (error) {
      this.logger.error('Gemini content generation failed', error as Error);
      return;
    }

    if (!raw) return;

    // 7. Parse and validate response
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.logger.error(
        `Gemini output was not valid JSON (truncated): ${raw.substring(
          0,
          200,
        )}`,
      );
      return;
    }

    const valResult = AiResponseSchema.safeParse(parsed);
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

    // 9. Process state updates
    if (data.stateUpdate) {
      const update = data.stateUpdate;

      // Update GameStateLog fields
      await this.prisma.gameStateLog.update({
        where: { id: stateLog.id },
        data: {
          ...(update.activeQuests && {
            activeQuests: update.activeQuests as unknown as Prisma.InputJsonValue,
          }),
          ...(update.npcRelationships && {
            npcRelationships: update.npcRelationships as unknown as Prisma.InputJsonValue,
          }),
          ...(update.campaignSummary && {
            campaignSummary: { text: update.campaignSummary } as unknown as Prisma.InputJsonValue,
          }),
        },
      });

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

    // 10. Broadcast narrative chat and HUD state updates
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
    );
  }
}
