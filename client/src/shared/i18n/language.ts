import type { Language } from '@dnd/shared';

/**
 * Supported UI languages. Re-exported from `@dnd/shared`'s `LanguageSchema`
 * (the source of truth also used server-side for campaign language) so the
 * client and server can never desync on what locales exist.
 */
export type { Language };

export const LANGUAGES: readonly Language[] = ['en', 'uk'];
