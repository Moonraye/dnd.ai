import { z } from 'zod';

// Mirror of the Prisma enums in server/prisma/schema.prisma.
export const SessionStatusSchema = z.enum(['LOBBY', 'ACTIVE', 'COMPLETED']);
export const SenderTypeSchema = z.enum(['HUMAN', 'AI_DM', 'AI_PLAYER', 'SYSTEM']);

export const CreateLobbySchema = z.object({
  title: z.string().min(3).max(80),
});

export const AbilityScoresSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});

export const InventoryItemSchema = z.object({
  name: z.string().min(1).max(60),
  qty: z.number().int().min(1),
});

export const CharacterSheetSchema = z
  .object({
    name: z.string().min(1).max(50),
    hpCurrent: z.number().int().min(0).max(9999),
    hpMax: z.number().int().min(1).max(9999),
    stats: AbilityScoresSchema,
    inventory: z.array(InventoryItemSchema).max(50).default([]),
    // ADR 4: AI-controlled sheets carry a provider/model pair; both null = human.
    aiProvider: z.string().min(1).max(100).nullable().default(null),
    aiModel: z.string().min(1).max(100).nullable().default(null),
    persona: z.string().max(1000).nullable().default(null),
  })
  .refine((s) => s.hpCurrent <= s.hpMax, {
    message: 'hpCurrent cannot exceed hpMax',
    path: ['hpCurrent'],
  })
  .refine((s) => (s.aiProvider === null) === (s.aiModel === null), {
    message: 'aiProvider and aiModel must be set together',
    path: ['aiModel'],
  });

export const ChatVisibilitySchema = z.enum(['PUBLIC', 'WHISPER']);

export const SendChatMessageSchema = z.object({
  sessionId: z.uuid(),
  messageText: z.string().min(1).max(2000),
  command: z.enum(['SAY', 'SHOUT', 'WHISPER']).nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
});

/**
 * In-session character mutations (HP, inventory). A partial patch — the
 * `hpCurrent <= hpMax` invariant is enforced server-side against the
 * merged sheet, since a patch alone can't see both fields.
 */
export const UpdateCharacterSheetSchema = z
  .object({
    sessionId: z.uuid(),
    hpCurrent: z.number().int().min(0).max(9999).optional(),
    hpMax: z.number().int().min(1).max(9999).optional(),
    inventory: z.array(InventoryItemSchema).max(50).optional(),
  })
  .refine(
    (patch) =>
      patch.hpCurrent !== undefined ||
      patch.hpMax !== undefined ||
      patch.inventory !== undefined,
    { message: 'Provide at least one field to update' },
  );

/**
 * Companion edit schema (name, persona, stats, HP max/current, inventory).
 * Enforces that at least one field is provided, and hpCurrent <= hpMax if both are present.
 */
export const EditCharacterSheetSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    persona: z.string().max(1000).nullable().optional(),
    hpCurrent: z.number().int().min(0).max(9999).optional(),
    hpMax: z.number().int().min(1).max(9999).optional(),
    stats: AbilityScoresSchema.optional(),
    inventory: z.array(InventoryItemSchema).max(50).optional(),
  })
  .refine(
    (patch) =>
      patch.name !== undefined ||
      patch.persona !== undefined ||
      patch.hpCurrent !== undefined ||
      patch.hpMax !== undefined ||
      patch.stats !== undefined ||
      patch.inventory !== undefined,
    { message: 'Provide at least one field to edit' },
  )
  .refine(
    (s) => {
      if (s.hpCurrent !== undefined && s.hpMax !== undefined) {
        return s.hpCurrent <= s.hpMax;
      }
      return true;
    },
    {
      message: 'hpCurrent cannot exceed hpMax',
      path: ['hpCurrent'],
    },
  );

/** Free-text concept the AI turns into a draft character sheet (ADR 4). */
export const GenerateCharacterDraftSchema = z.object({
  prompt: z.string().min(1).max(500),
});

/**
 * A single immutable canon fact with provenance (COUNCIL-AUDIT Phase 2):
 * `dm` = established by the DM/story (authoritative); `player` = asserted by a
 * player and not independently verified. The tag lets the prompt treat
 * player-claims skeptically and resists ledger poisoning via chat.
 */
export const KeyFactSourceSchema = z.enum(['dm', 'player']);
export const KeyFactSchema = z.object({
  text: z.string().min(1).max(200),
  source: KeyFactSourceSchema,
});
export type KeyFactSource = z.infer<typeof KeyFactSourceSchema>;
export type KeyFact = z.infer<typeof KeyFactSchema>;

export const AiStateUpdateSchema = z.object({
  activeQuests: z.array(z.string().max(200)).max(20).optional(),
  // Bound both key and value, and cap the map size — the model output flows
  // straight into GameStateLog and is re-broadcast to the whole room.
  npcRelationships: z
    .record(z.string().max(60), z.string().max(300))
    .refine((rels) => Object.keys(rels).length <= 50, {
      message: 'Too many NPC relationships (max 50)',
    })
    .optional(),
  campaignSummary: z.string().max(2000).optional(),
  // Append-only ledger of immutable canon (names, deaths, promises, places),
  // each tagged with provenance. The service dedups and caps these; the model
  // only ever adds new entries.
  keyFacts: z.array(KeyFactSchema).max(100).optional(),
  hpChanges: z
    .array(
      z.object({
        characterName: z.string().max(50),
        delta: z.number().int().min(-999).max(999),
      }),
    )
    .max(10)
    .optional(),
  inventoryChanges: z
    .array(
      z.object({
        characterName: z.string().max(50),
        item: z.string().max(60),
        qty: z.number().int().min(-99).max(99),
      }),
    )
    .max(10)
    .optional(),
});

export const AiResponseSchema = z.object({
  messageText: z.string().min(1).max(3000),
  stateUpdate: AiStateUpdateSchema.optional(),
  diceRolls: z
    .array(
      z.object({
        characterName: z.string().max(50),
        notation: z.string().max(30),
        reason: z.string().max(200),
      }),
    )
    .max(5)
    .optional(),
});
