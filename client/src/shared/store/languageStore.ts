import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Language } from '@/shared/i18n/language';

/** localStorage key holding the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = 'dundrai-language';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Persists the UI language to localStorage. The store always boots with
 * `'en'` (matching what the server renders) and `skipHydration: true`, so
 * the real language — a stored choice, or else the browser's language —
 * is only applied once `LanguageProvider` runs in a post-mount effect. This
 * is the same "sync after mount" approach `sessionStore` uses, which avoids
 * a React hydration mismatch (see also `features/theme` for the non-zustand
 * equivalent of this pattern).
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
