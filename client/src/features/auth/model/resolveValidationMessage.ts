import type { Dictionary } from '@/shared/i18n';

const VALIDATION_KEY_PREFIX = 'validation.';

/**
 * Zod schema `message`s in this feature are stable dictionary keys (e.g.
 * `'validation.emailInvalid'`) so the same schema validates in every locale.
 * Resolves a key to the active dictionary's copy; any other string (e.g. a
 * message zod generated itself, or one we didn't map) passes through as-is.
 * A `validation.`-prefixed key that doesn't resolve to a known dictionary
 * entry falls back to `validation.generic` instead of leaking the raw key.
 */
export function resolveValidationMessage(t: Dictionary, message: string): string {
  if (!message.startsWith(VALIDATION_KEY_PREFIX)) return message;
  const key = message.slice(VALIDATION_KEY_PREFIX.length);
  // Guard against inherited `Object.prototype` members (e.g. `toString`,
  // `constructor`) so a key like `'validation.toString'` can't resolve to
  // the inherited function instead of falling back to `validation.generic`.
  if (
    Object.prototype.hasOwnProperty.call(t.validation, key) &&
    typeof t.validation[key as keyof Dictionary['validation']] === 'string'
  ) {
    return t.validation[key as keyof Dictionary['validation']];
  }
  return t.validation.generic;
}
