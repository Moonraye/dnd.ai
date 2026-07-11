import { parseDiceNotation } from '@dnd/shared';

describe('parseDiceNotation', () => {
  it('parses a multi-term expression into signed terms and canonical form', () => {
    const result = parseDiceNotation('1d20+2d6-3');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.notation).toBe('1d20+2d6-3');
    expect(result.data.terms).toEqual([
      { sign: 1, count: 1, sides: 20 },
      { sign: 1, count: 2, sides: 6 },
      { sign: -1, value: 3 },
    ]);
  });

  it('defaults an omitted count to a single die', () => {
    const result = parseDiceNotation('d20');
    expect(result.success && result.data.notation).toBe('1d20');
  });

  it('strips whitespace before parsing', () => {
    const result = parseDiceNotation(' 2d6 + 3 ');
    expect(result.success && result.data.notation).toBe('2d6+3');
  });

  it('rejects an unsupported die size', () => {
    const result = parseDiceNotation('3d7');
    expect(result).toEqual({ success: false, error: 'Unsupported die: d7' });
  });

  it('rejects more than 50 dice total', () => {
    expect(parseDiceNotation('51d6').success).toBe(false);
  });

  it('rejects more than 10 terms', () => {
    const result = parseDiceNotation('d4+d4+d4+d4+d4+d4+d4+d4+d4+d4+d4');
    expect(result.success).toBe(false);
  });

  it('rejects a constant modifier above 999', () => {
    expect(parseDiceNotation('1d20+1000').success).toBe(false);
  });

  it('rejects a pure-constant roll with no dice', () => {
    expect(parseDiceNotation('5')).toEqual({
      success: false,
      error: 'Include at least one die (e.g. 1d20)',
    });
  });

  it('rejects garbage and empty input', () => {
    expect(parseDiceNotation('abc').success).toBe(false);
    expect(parseDiceNotation('').success).toBe(false);
  });
});
