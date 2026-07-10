import type { CreateLobbyInput, SessionSummary } from '@dnd/shared';
import { apiFetch } from '@/shared/api/httpClient';

export function createLobby(input: CreateLobbyInput): Promise<SessionSummary> {
  return apiFetch<SessionSummary>('/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listLobbies(): Promise<SessionSummary[]> {
  return apiFetch<SessionSummary[]>('/sessions');
}
