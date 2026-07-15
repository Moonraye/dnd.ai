import { pluralize } from './pluralize';

describe('pluralize', () => {
  describe('en', () => {
    it('buckets 1 as "one"', () => {
      expect(pluralize('en', 1)).toBe('one');
    });

    it.each([0, 2, 3, 5, 11, 21])('buckets %d as "other"', (n) => {
      expect(pluralize('en', n)).toBe('other');
    });
  });

  describe('uk', () => {
    it.each([1, 21, 31])('buckets %d as "one"', (n) => {
      expect(pluralize('uk', n)).toBe('one');
    });

    it.each([2, 3, 4, 22, 23, 24])('buckets %d as "few"', (n) => {
      expect(pluralize('uk', n)).toBe('few');
    });

    it.each([0, 5, 6, 11, 12, 13, 14, 20, 25])('buckets %d as "many"', (n) => {
      expect(pluralize('uk', n)).toBe('many');
    });

    it('resolves the 1 / 3 / 5 sanity check from the pluralization spec', () => {
      expect(pluralize('uk', 1)).toBe('one');
      expect(pluralize('uk', 3)).toBe('few');
      expect(pluralize('uk', 5)).toBe('many');
    });

    it('buckets a non-integer count as "other" per CLDR', () => {
      expect(pluralize('uk', 1.5)).toBe('other');
    });
  });
});
