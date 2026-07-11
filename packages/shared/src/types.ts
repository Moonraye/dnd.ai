import type { z } from 'zod';
import type {
  SessionStatusSchema,
  SenderTypeSchema,
  CreateLobbySchema,
  AbilityScoresSchema,
  InventoryItemSchema,
  CharacterSheetSchema,
  SendChatMessageSchema,
  UpdateCharacterSheetSchema,
  GenerateCharacterDraftSchema,
} from './validation';

export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type SenderType = z.infer<typeof SenderTypeSchema>;
export type CreateLobbyInput = z.infer<typeof CreateLobbySchema>;
export type AbilityScores = z.infer<typeof AbilityScoresSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type CharacterSheetInput = z.infer<typeof CharacterSheetSchema>;
export type SendChatMessageInput = z.infer<typeof SendChatMessageSchema>;
export type UpdateCharacterSheetInput = z.infer<
  typeof UpdateCharacterSheetSchema
>;
export type GenerateCharacterDraftInput = z.infer<
  typeof GenerateCharacterDraftSchema
>;
