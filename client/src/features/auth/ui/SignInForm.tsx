'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useSignIn } from '../model/useSignIn';
import { AuthField } from './AuthField';

export function SignInForm() {
  const router = useRouter();
  const { submit, isSubmitting, error, fieldErrors } = useSignIn();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData));
    if (ok) router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
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
        autoComplete="current-password"
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
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
