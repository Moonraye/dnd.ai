'use client';

import type { FormEvent } from 'react';
import { Button, Input } from '@/shared/ui';
import { useCreateLobby } from '../model/useCreateLobby';

export function CreateLobbyForm({ onDone }: { onDone?: () => void }) {
  const { submit, isSubmitting, error } = useCreateLobby();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(String(formData.get('title') ?? ''));
    if (ok) onDone?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg">Campaign title</span>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus the sole field when the dialog opens */}
        <Input
          name="title"
          type="text"
          placeholder="The Sunless Citadel"
          autoFocus
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating…' : 'Create campaign'}
      </Button>
    </form>
  );
}
