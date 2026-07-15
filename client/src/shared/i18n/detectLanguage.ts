import type { Language } from './language';

/**
 * Best-effort first-visit language detection from the browser: Ukrainian if
 * `navigator.language`/`navigator.languages` reports any `uk*` locale,
 * English otherwise. Only used when no explicit choice is stored yet — see
 * `LanguageProvider`, which always prefers a stored value over this.
 */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  const isUkrainian = candidates.some((lang) =>
    lang?.toLowerCase().startsWith('uk'),
  );
  return isUkrainian ? 'uk' : 'en';
}
