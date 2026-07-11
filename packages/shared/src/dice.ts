import { z } from 'zod';

/** Polyhedral dice the roller supports (ADR: no full 5e rules engine). */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type DiceSides = (typeof DICE_SIDES)[number];

/** Caps that keep a single roll cheap to validate, roll, and render. */
export const MAX_TERMS = 10;
export const MAX_DICE = 50;
export const MAX_CONSTANT = 999;
export const MAX_NOTATION_LENGTH = 100;

export interface ParsedDiceTerm {
  sign: 1 | -1;
  count: number;
  sides: number;
}

export interface ParsedConstantTerm {
  sign: 1 | -1;
  value: number;
}

export type ParsedTerm = ParsedDiceTerm | ParsedConstantTerm;

export interface ParsedDiceNotation {
  terms: ParsedTerm[];
  /** Canonical form, e.g. `1d20+2d6-3`. */
  notation: string;
}

export type ParseResult =
  | { success: true; data: ParsedDiceNotation }
  | { success: false; error: string };

export function isDiceTerm(term: ParsedTerm): term is ParsedDiceTerm {
  return 'sides' in term;
}

function fail(error: string): ParseResult {
  return { success: false, error };
}

function toCanonical(terms: ParsedTerm[]): string {
  return terms
    .map((term, index) => {
      const body = isDiceTerm(term)
        ? `${term.count}d${term.sides}`
        : `${term.value}`;
      if (index === 0) return term.sign === -1 ? `-${body}` : body;
      return term.sign === -1 ? `-${body}` : `+${body}`;
    })
    .join('');
}

/**
 * Parse a multi-term dice expression (`1d20+2d6-3`) into signed terms.
 * The single grammar authority: the client uses it for live preview and
 * the server re-validates with it before rolling.
 */
export function parseDiceNotation(input: string): ParseResult {
  const cleaned = input.replace(/\s+/g, '');
  if (cleaned.length === 0) return fail('Enter a dice expression');
  if (cleaned.length > MAX_NOTATION_LENGTH) {
    return fail('Dice expression is too long');
  }

  const shape = /^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i;
  if (!shape.test(cleaned)) {
    return fail('Invalid dice notation (e.g. 1d20+2d6-3)');
  }

  const normalized = /^[+-]/.test(cleaned) ? cleaned : `+${cleaned}`;
  const termPattern = /([+-])(\d*d\d+|\d+)/gi;
  const terms: ParsedTerm[] = [];
  let totalDice = 0;
  let hasDie = false;

  for (const match of normalized.matchAll(termPattern)) {
    const sign: 1 | -1 = match[1] === '-' ? -1 : 1;
    const body = match[2].toLowerCase();

    if (body.includes('d')) {
      const [countStr, sidesStr] = body.split('d');
      const count = countStr === '' ? 1 : Number(countStr);
      const sides = Number(sidesStr);
      if (count < 1) return fail('Each dice term needs at least 1 die');
      if (!DICE_SIDES.includes(sides as DiceSides)) {
        return fail(`Unsupported die: d${sides}`);
      }
      totalDice += count;
      hasDie = true;
      terms.push({ sign, count, sides });
    } else {
      const value = Number(body);
      if (value > MAX_CONSTANT) {
        return fail(`Constant modifier cannot exceed ${MAX_CONSTANT}`);
      }
      terms.push({ sign, value });
    }
  }

  if (terms.length > MAX_TERMS) return fail(`Too many terms (max ${MAX_TERMS})`);
  if (totalDice > MAX_DICE) return fail(`Too many dice (max ${MAX_DICE})`);
  if (!hasDie) return fail('Include at least one die (e.g. 1d20)');

  return { success: true, data: { terms, notation: toCanonical(terms) } };
}

/** client → server, with ack: request an authoritative dice roll. */
export const DiceRollSchema = z
  .object({
    sessionId: z.uuid(),
    notation: z.string().min(1).max(MAX_NOTATION_LENGTH),
  })
  .superRefine((val, ctx) => {
    const result = parseDiceNotation(val.notation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message: result.error,
        path: ['notation'],
      });
    }
  });

export type DiceRollInput = z.infer<typeof DiceRollSchema>;

/** Per-term outcome carried in the persisted/broadcast roll metadata. */
export type DiceTermResult =
  | { count: number; sides: number; rolls: number[]; subtotal: number }
  | { constant: number };

export function isDiceTermResult(
  term: DiceTermResult,
): term is { count: number; sides: number; rolls: number[]; subtotal: number } {
  return 'sides' in term;
}

/**
 * Structured payload stored on a SYSTEM `ChatMessage.metadata` so the
 * client can render a rich dice card instead of parsing text.
 */
export interface DiceRollMetadata {
  kind: 'dice_roll';
  notation: string;
  terms: DiceTermResult[];
  modifierTotal?: number;
  total: number;
  characterName: string;
}
