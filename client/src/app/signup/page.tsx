'use client';

import Link from 'next/link';
import { AuthShell, SignUpForm } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';

export default function SignUpPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t.auth.signUp.title}
      subtitle={t.auth.signUp.subtitle}
      footer={
        <>
          {t.auth.signUp.footerPrompt}{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.auth.signUp.footerLink}
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
