import { LANGUAGES, type Language } from './language';

const FALLBACK_LANGUAGE: Language = 'en';

/**
 * Best-effort first-visit language detection from the browser: matches any
 * `navigator.language`/`navigator.languages` locale against `LANGUAGES`
 * (other than the fallback) by prefix — e.g. `'uk'` matches `'uk-UA'` —
 * falling back to `'en'` otherwise. Only used when no explicit choice is
 * stored yet — see `LanguageProvider`, which always prefers a stored value
 * over this.
 */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return FALLBACK_LANGUAGE;
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  const detected = LANGUAGES.filter((lang) => lang !== FALLBACK_LANGUAGE).find(
    (lang) => candidates.some((candidate) => candidate?.toLowerCase().startsWith(lang)),
  );
  return detected ?? FALLBACK_LANGUAGE;
}
