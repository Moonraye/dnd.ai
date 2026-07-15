'use client';

import { useEffect, type ReactNode } from 'react';
import { LANGUAGE_STORAGE_KEY, useLanguageStore } from '@/shared/store/languageStore';
import { detectBrowserLanguage } from '../detectLanguage';

/**
 * Mount once near the root (see `app/layout.tsx`, next to `ThemeProvider`).
 * The language store boots as `'en'` (skipHydration: true) so the first
 * client render matches the server; this effect applies the real language
 * right after mount, once hydration has already reconciled — the same
 * "sync after mount" trick `ThemeProvider` uses for `data-theme`:
 *
 * - A previously stored choice (the user explicitly switched before) always
 *   wins: rehydrate it from localStorage.
 * - Otherwise (first visit) fall back to the browser's language, defaulting
 *   to Ukrainian for `uk*` locales and English for everything else.
 *
 * Also keeps `<html lang>` in sync with the active language (same "sync
 * after mount" spirit as `ThemeProvider` syncing `data-theme`), so it always
 * reflects a stored/detected choice while the SSR default in `layout.tsx`
 * stays `"en"`.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let hasStoredChoice = false;
    try {
      hasStoredChoice = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) !== null;
    } catch {
      // localStorage may be unavailable (private mode) — fall through to
      // browser-language detection below.
    }

    if (hasStoredChoice) {
      void useLanguageStore.persist.rehydrate();
    } else {
      useLanguageStore.getState().setLanguage(detectBrowserLanguage());
    }
  }, []);

  return <>{children}</>;
}
