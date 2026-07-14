export type Theme = 'dark' | 'light';

/** localStorage key holding the user's explicit theme choice. */
export const THEME_STORAGE_KEY = 'dnd-theme';

/** Apply a theme to the document and persist the choice. Client-only. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage may be unavailable (private mode) — the attribute still applies.
  }
}

/** Read the theme currently applied to the document (set by the init script). */
export function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark';
}

/**
 * Runs before paint (inlined in <body>) to set data-theme with no flash:
 * an explicit stored choice wins; otherwise follow the OS on first visit.
 * Dark-first fallback if anything throws.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
