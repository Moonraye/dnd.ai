import { format } from './format';

describe('format', () => {
  it('interpolates a single placeholder', () => {
    expect(format('Total: {total}', { total: 12 })).toBe('Total: 12');
  });

  it('interpolates multiple distinct placeholders', () => {
    expect(
      format('{count}/{max} players', { count: 3, max: 5 }),
    ).toBe('3/5 players');
  });

  it('interpolates a repeated placeholder at every occurrence', () => {
    expect(format('{n} and {n} again', { n: 4 })).toBe('4 and 4 again');
  });

  it('leaves a placeholder literal when its param is missing', () => {
    expect(format('Hello {name}', {})).toBe('Hello {name}');
  });

  it('substitutes a numeric 0 correctly (not treated as missing)', () => {
    expect(format('Total: {total}', { total: 0 })).toBe('Total: 0');
  });

  it('leaves "{constructor}" literal when params does not define it', () => {
    expect(format('Hello {constructor}', {})).toBe('Hello {constructor}');
  });

  it('leaves "{toString}" literal when params does not define it', () => {
    expect(format('Hello {toString}', {})).toBe('Hello {toString}');
  });
});
