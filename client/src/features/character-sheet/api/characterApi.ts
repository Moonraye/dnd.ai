import type {
  CharacterSheetInput,
  CharacterSheetPayload,
  GenerateCharacterDraftInput,
} from '@dnd/shared';
import { apiFetch } from '@/shared/api/httpClient';

export function createCharacter(
  sessionId: string,
  input: CharacterSheetInput,
): Promise<CharacterSheetPayload> {
  return apiFetch<CharacterSheetPayload>(`/sessions/${sessionId}/characters`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function generateCharacterDraft(
  input: GenerateCharacterDraftInput,
): Promise<CharacterSheetInput> {
  return apiFetch<CharacterSheetInput>('/ai/character-draft', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
