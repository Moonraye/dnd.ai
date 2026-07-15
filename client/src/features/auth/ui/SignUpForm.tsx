'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useTranslation } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { resolveValidationMessage } from '../model/resolveValidationMessage';
import { useSignUp } from '../model/useSignUp';
import { AuthField } from './AuthField';

export function SignUpForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { submit, isSubmitting, error, fieldErrors } = useSignUp();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await submit(Object.fromEntries(formData));
    if (ok) router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      <AuthField
        label={t.auth.signUp.usernameLabel}
        name="username"
        type="text"
        autoComplete="username"
        error={fieldErrors.username && resolveValidationMessage(t, fieldErrors.username)}
      />
      <AuthField
        label={t.auth.signUp.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email && resolveValidationMessage(t, fieldErrors.email)}
      />
      <AuthField
        label={t.auth.signUp.passwordLabel}
        name="password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password && resolveValidationMessage(t, fieldErrors.password)}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? t.auth.signUp.submitting : t.auth.signUp.submit}
      </Button>
    </form>
  );
}
