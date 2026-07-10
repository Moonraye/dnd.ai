import { z } from 'zod';

// Mirror of the Prisma enums in server/prisma/schema.prisma.
export const SessionStatusSchema = z.enum(['LOBBY', 'ACTIVE', 'COMPLETED']);
export const SenderTypeSchema = z.enum(['HUMAN', 'AI_DM', 'AI_PLAYER']);

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
  name: z.string().min(1),
  qty: z.number().int().min(1),
});

export const CharacterSheetSchema = z
  .object({
    name: z.string().min(1).max(50),
    hpCurrent: z.number().int().min(0),
    hpMax: z.number().int().min(1),
    stats: AbilityScoresSchema,
    inventory: z.array(InventoryItemSchema).default([]),
    // ADR 4: AI-controlled sheets carry a provider/model pair; both null = human.
    aiProvider: z.string().min(1).nullable().default(null),
    aiModel: z.string().min(1).nullable().default(null),
  })
  .refine((s) => s.hpCurrent <= s.hpMax, {
    message: 'hpCurrent cannot exceed hpMax',
    path: ['hpCurrent'],
  })
  .refine((s) => (s.aiProvider === null) === (s.aiModel === null), {
    message: 'aiProvider and aiModel must be set together',
    path: ['aiModel'],
  });

export const SendChatMessageSchema = z.object({
  sessionId: z.uuid(),
  messageText: z.string().min(1).max(2000),
});
