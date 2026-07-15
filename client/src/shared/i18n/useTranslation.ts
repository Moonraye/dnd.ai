'use client';

import { useLanguageStore } from '@/shared/store/languageStore';
import { dictionaries } from './dictionaries';
import type { Dictionary } from './dictionary';
import type { Language } from './language';

interface UseTranslationResult {
  /** The active dictionary — access copy as `t.header.signIn`. */
  t: Dictionary;
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Type-safe translation hook. Components read copy from `t` (a plain
 * dictionary object, so missing keys are caught by `tsc`) instead of a
 * stringly-typed `t('key.path')` call.
 */
export function useTranslation(): UseTranslationResult {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return { t: dictionaries[language], language, setLanguage };
}
