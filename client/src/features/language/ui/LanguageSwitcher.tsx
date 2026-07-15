'use client';

import { LANGUAGES, useTranslation, type Language } from '@/shared/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';

const LABEL_KEYS: Record<Language, 'english' | 'ukrainian'> = {
  en: 'english',
  uk: 'ukrainian',
};

/**
 * Header control that opens a dropdown to pick English or Ukrainian.
 * Styled like `ThemeToggle` (same border/sizing language for header
 * controls); the active language gets a checkmark, mirroring the user
 * menu's dropdown in `Header`.
 */
export function LanguageSwitcher() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.common.language.switchLabel}
        title={t.common.language.switchLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LANGUAGES.map((value) => (
          <DropdownMenuItem key={value} onSelect={() => setLanguage(value)}>
            <span className="flex-1">{t.common.language[LABEL_KEYS[value]]}</span>
            {language === value ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
