import { applyStandardArray } from './standardArray';

describe('applyStandardArray', () => {
  it('assigns the standard array in the default STR→CHA order', () => {
    expect(applyStandardArray()).toEqual({
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8,
    });
  });

  it('respects a custom priority order', () => {
    const scores = applyStandardArray(['cha', 'dex', 'con', 'int', 'wis', 'str']);
    expect(scores.cha).toBe(15);
    expect(scores.str).toBe(8);
  });
});
