import type { Language } from './language';

/**
 * CLDR-style plural categories. English only distinguishes `one` (n === 1)
 * from `other`; Ukrainian additionally distinguishes `few` per the standard
 * mod-10/mod-100 rules. Dictionary strings that need this (e.g.
 * `sessionRail.summonPlayers`) carry all four keys so every locale's
 * dictionary shape stays uniform and typed — English simply repeats its
 * `other` copy under `few`/`many`.
 */
export type PluralCategory = 'one' | 'few' | 'many' | 'other';

/** Resolves `count` to a plural category for `language`. */
export function pluralize(language: Language, count: number): PluralCategory {
  return language === 'uk' ? pluralizeUkrainian(count) : pluralizeEnglish(count);
}

function pluralizeEnglish(count: number): PluralCategory {
  return Math.abs(count) === 1 ? 'one' : 'other';
}

/**
 * Standard Ukrainian (and Russian-family) plural rule:
 * - `one`:  ends in 1, except when ending in 11        (1, 21, 31… but not 11)
 * - `few`:  ends in 2-4, except when ending in 12-14    (2, 3, 4, 22… but not 12-14)
 * - `many`: everything else                             (0, 5-20, 25-30…)
 */
function pluralizeUkrainian(count: number): PluralCategory {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
  return 'many';
}
