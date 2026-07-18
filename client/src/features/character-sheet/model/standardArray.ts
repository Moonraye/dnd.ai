import type { AbilityScores } from '@dnd/shared';

export const ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
] as const satisfies readonly (keyof AbilityScores)[];

export const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

/** The 5e "standard array" of ability scores, highest to lowest. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/**
 * Assign the standard array to abilities in the given priority order.
 * Defaults to STR→DEX→CON→INT→WIS→CHA; the player can still edit after.
 */
export function applyStandardArray(
  order: readonly (keyof AbilityScores)[] = ABILITY_KEYS,
): AbilityScores {
  const scores = {} as AbilityScores;
  ABILITY_KEYS.forEach((key) => {
    scores[key] = 10;
  });
  order.forEach((key, index) => {
    scores[key] = STANDARD_ARRAY[index] ?? 8;
  });
  return scores;
}
