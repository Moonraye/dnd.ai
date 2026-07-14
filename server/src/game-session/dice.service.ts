import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  isDiceTerm,
  parseDiceNotation,
  type DiceRollMetadata,
  type DiceTermResult,
} from '@dnd/shared';

export interface DiceRollResult {
  messageText: string;
  metadata: DiceRollMetadata;
}

@Injectable()
export class DiceService {
  /**
   * Authoritative roll: re-validate the notation (never trust the client),
   * roll each die with a CSPRNG, and build the persistable metadata.
   */
  roll(notation: string, characterName: string): DiceRollResult {
    const parsed = parseDiceNotation(notation);
    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    const terms: DiceTermResult[] = [];
    let total = 0;
    let modifierTotal = 0;
    let hasConstant = false;

    for (const term of parsed.data.terms) {
      if (isDiceTerm(term)) {
        const rolls: number[] = [];
        for (let i = 0; i < term.count; i++) {
          rolls.push(this.rollDie(term.sides));
        }
        const subtotal = term.sign * rolls.reduce((sum, r) => sum + r, 0);
        total += subtotal;
        terms.push({ count: term.count, sides: term.sides, rolls, subtotal });
      } else {
        const constant = term.sign * term.value;
        total += constant;
        modifierTotal += constant;
        hasConstant = true;
        terms.push({ constant });
      }
    }

    const metadata: DiceRollMetadata = {
      kind: 'dice_roll',
      notation: parsed.data.notation,
      terms,
      ...(hasConstant ? { modifierTotal } : {}),
      total,
      characterName,
    };

    return {
      messageText: `${characterName} rolled ${parsed.data.notation} → ${total}`,
      metadata,
    };
  }

  /** Overridable seam so specs can inject a deterministic sequence. */
  protected rollDie(sides: number): number {
    return randomInt(1, sides + 1);
  }
}
