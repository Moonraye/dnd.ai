import { isDiceTermResult } from '@dnd/shared';
import { DiceService } from './dice.service';

// Feeds a fixed sequence through the protected RNG seam for determinism.
class SeededDiceService extends DiceService {
  private readonly queue: number[];
  constructor(sequence: number[]) {
    super();
    this.queue = [...sequence];
  }
  protected override rollDie(): number {
    return this.queue.shift() ?? 1;
  }
}

describe('DiceService', () => {
  it('rolls each die, applies signs, and builds metadata', () => {
    const service = new SeededDiceService([14, 4, 5]);

    const { messageText, metadata } = service.roll('1d20+2d6-3', 'Thorin');

    expect(metadata.total).toBe(20); // 14 + (4 + 5) - 3
    expect(metadata.modifierTotal).toBe(-3);
    expect(metadata.characterName).toBe('Thorin');
    expect(metadata.notation).toBe('1d20+2d6-3');
    expect(messageText).toBe('Thorin rolled 1d20+2d6-3 → 20');

    const diceTerms = metadata.terms.filter(isDiceTermResult);
    expect(diceTerms[0]).toEqual({
      count: 1,
      sides: 20,
      rolls: [14],
      subtotal: 14,
    });
    expect(diceTerms[1]).toEqual({
      count: 2,
      sides: 6,
      rolls: [4, 5],
      subtotal: 9,
    });
  });

  it('omits modifierTotal when the roll has no constant term', () => {
    const service = new SeededDiceService([3, 6]);

    const { metadata } = service.roll('2d6', 'Elora');

    expect(metadata.modifierTotal).toBeUndefined();
    expect(metadata.total).toBe(9);
  });

  it('produces rolls within the die range using the real RNG', () => {
    const service = new DiceService();

    const { metadata } = service.roll('20d20', 'Random');

    const [term] = metadata.terms;
    if (!isDiceTermResult(term)) throw new Error('expected a dice term');
    expect(term.rolls).toHaveLength(20);
    for (const roll of term.rolls) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });

  it('throws on notation that fails re-validation', () => {
    const service = new DiceService();
    expect(() => service.roll('3d7', 'Cheater')).toThrow();
  });
});
