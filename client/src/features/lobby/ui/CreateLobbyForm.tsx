'use client';

import type { FormEvent } from 'react';
import { useCreateLobby } from '../model/useCreateLobby';

export function CreateLobbyForm() {
  const { submit, isSubmitting, error } = useCreateLobby();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await submit(String(formData.get('title') ?? ''));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Campaign title</span>
        <input
          name="title"
          type="text"
          placeholder="The Sunless Citadel"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isSubmitting ? 'Creating…' : 'Create lobby'}
      </button>
    </form>
  );
}
