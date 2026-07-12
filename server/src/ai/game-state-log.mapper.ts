import type { KeyFact } from '@dnd/shared';
import type { GameStateLogPayload } from '@dnd/shared';
import type { GameStateLog } from '../generated/prisma/client';

/**
 * Normalize the stored `keyFacts` Json into typed, provenance-tagged facts.
 * Tolerates the pre-provenance shape (plain `string[]`), promoting bare strings
 * to `dm`-canon so older rows keep rendering after the Phase 2 upgrade.
 */
export function coerceKeyFacts(raw: unknown): KeyFact[] {
  if (!Array.isArray(raw)) return [];
  const facts: KeyFact[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      if (entry.trim()) facts.push({ text: entry.trim(), source: 'dm' });
    } else if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { text?: unknown }).text === 'string' &&
      (entry as { text: string }).text.trim()
    ) {
      const text = (entry as { text: string }).text.trim();
      const source =
        (entry as { source?: unknown }).source === 'player' ? 'player' : 'dm';
      facts.push({ text, source });
    }
  }
  return facts;
}

/**
 * Map a persisted GameStateLog row to its wire payload. `campaignSummary` is
 * stored as a JSON object (`{ text }`) but exposed to clients as a plain
 * string; the Json columns are narrowed to their known runtime shapes.
 */
export function toStateLogPayload(row: GameStateLog): GameStateLogPayload {
  const summary = row.campaignSummary as { text?: string } | null;
  return {
    sessionId: row.sessionId,
    activeQuests: (row.activeQuests as string[] | null) ?? [],
    npcRelationships:
      (row.npcRelationships as Record<string, string> | null) ?? {},
    campaignSummary: summary?.text ?? '',
    keyFacts: coerceKeyFacts(row.keyFacts),
    updatedAt: row.updatedAt.toISOString(),
  };
}
