'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useSignUp } from '../model/useSignUp';
import { AuthField } from './AuthField';

export function SignUpForm() {
  const router = useRouter();
  const { submit, isSubmitting, error, fieldErrors } = useSignUp();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData));
    if (ok) router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <AuthField
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        error={fieldErrors.username}
      />
      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password}
      />
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
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
