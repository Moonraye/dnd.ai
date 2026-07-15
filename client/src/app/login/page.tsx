'use client';

import Link from 'next/link';
import { AuthShell, SignInForm } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t.auth.signIn.title}
      subtitle={t.auth.signIn.subtitle}
      footer={
        <>
          {t.auth.signIn.footerPrompt}{' '}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.auth.signIn.footerLink}
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
