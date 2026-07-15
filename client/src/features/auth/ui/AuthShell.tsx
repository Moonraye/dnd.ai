'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslation } from '@/shared/i18n';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Split-screen auth: an atmospheric brand panel (carrying the landing's
 * candlelit read-aloud thread) beside the form. The panel is hidden below
 * `lg`, collapsing to a single centered column on smaller screens.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-dvh flex-1">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-bg-subtle p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/3 top-1/2 h-[36rem] w-[36rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
          <div className="absolute bottom-0 left-0 h-64 w-96 rounded-full bg-accent/[0.06] blur-[110px]" />
        </div>

        <Link
          href="/"
          className="font-display text-2xl font-semibold tracking-tight text-fg transition-colors hover:text-primary"
        >
          DunDrAI
        </Link>

        <blockquote className="max-w-md">
          <p className="font-display text-3xl leading-relaxed italic text-fg">
            {t.auth.brand.quote}
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-accent">
            {t.auth.brand.kicker}
          </p>
        </blockquote>

        <p className="text-xs text-fg-subtle">{t.auth.brand.footer}</p>
      </aside>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-block font-display text-xl font-semibold tracking-tight text-fg lg:hidden"
          >
            DunDrAI
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            {title}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-fg-subtle">
              {t.auth.divider}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton />

          <p className="mt-6 text-sm text-fg-muted">{footer}</p>
        </div>
      </div>
    </main>
  );
}
