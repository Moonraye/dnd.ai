'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useTranslation } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { resolveValidationMessage } from '../model/resolveValidationMessage';
import { useSignIn } from '../model/useSignIn';
import { AuthField } from './AuthField';

export function SignInForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { submit, isSubmitting, error, fieldErrors } = useSignIn();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData));
    if (ok) router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      <AuthField
        label={t.auth.signIn.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email && resolveValidationMessage(t, fieldErrors.email)}
      />
      <AuthField
        label={t.auth.signIn.passwordLabel}
        name="password"
        type="password"
        autoComplete="current-password"
        error={fieldErrors.password && resolveValidationMessage(t, fieldErrors.password)}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? t.auth.signIn.submitting : t.auth.signIn.submit}
      </Button>
    </form>
  );
}
