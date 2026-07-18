'use client';

import type { Language } from '@dnd/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, Input } from '@/shared/ui';
import { useCreateLobby } from '../model/useCreateLobby';

const LANGUAGE_OPTIONS: { value: Language; labelKey: 'english' | 'ukrainian' }[] = [
  { value: 'en', labelKey: 'english' },
  { value: 'uk', labelKey: 'ukrainian' },
];

export function CreateLobbyForm({ onDone }: { onDone?: () => void }) {
  const { t, language } = useTranslation();
  const { submit, isSubmitting, error } = useCreateLobby();
  // Defaults to the creator's current UI language; immutable once the
  // campaign exists, so this is the only place it is ever chosen.
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(String(formData.get('title') ?? ''), selectedLanguage);
    if (ok) onDone?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg">{t.lobby.createForm.titleLabel}</span>
        <Input
          name="title"
          type="text"
          placeholder={t.lobby.createForm.titlePlaceholder}
          autoFocus
        />
      </label>
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg">{t.lobby.createForm.languageLabel}</span>
        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle p-1">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedLanguage === option.value}
              onClick={() => setSelectedLanguage(option.value)}
              className={cn(
                'flex-1 rounded-[0.3rem] px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg',
                selectedLanguage === option.value &&
                  'bg-surface text-fg shadow-[var(--shadow-sm)]',
              )}
            >
              {t.common.language[option.labelKey]}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t.lobby.createForm.submitting : t.lobby.createForm.submit}
      </Button>
    </form>
  );
}
