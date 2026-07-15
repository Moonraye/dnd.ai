'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useAuthStore } from '@/shared/store/authStore';
import { buttonVariants } from '@/shared/ui';

// The AI DM's opening read-aloud. Boxed/italic "read-aloud text" is the D&D
// convention for what the DM narrates to set a scene — so the landing hero is
// that exact artifact, written live in front of the visitor.
const TYPE_MS = 26;

export function HeroScene() {
  const { t } = useTranslation();
  const openingScene = t.home.openingScene;
  const [typed, setTyped] = useState('');
  const status = useAuthStore((state) => state.status);
  const ctaHref = status === 'authenticated' ? '/lobby?create=1' : '/login';

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // setState only ever happens inside the interval callback (not
    // synchronously in the effect body) — for reduced motion the interval
    // just fires once and reveals the full line, instead of one glyph at a
    // time.
    let i = reduce ? openingScene.length : 0;
    const id = window.setInterval(
      () => {
        if (!reduce) i += 1;
        setTyped(openingScene.slice(0, i));
        if (i >= openingScene.length) window.clearInterval(id);
      },
      reduce ? 0 : TYPE_MS,
    );
    return () => window.clearInterval(id);
    // Re-run the typewriter whenever the active language (and thus the
    // narration text) changes, not just on mount.
  }, [openingScene]);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient candlelight — the one atmospheric flourish. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute left-1/2 top-[40%] h-64 w-[30rem] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[110px]" />
      </div>

      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          {t.home.badge}
        </span>

        {/* Signature: the read-aloud narration card, written live. */}
        <div className="w-full rounded-lg border border-border bg-surface/70 p-8 text-left shadow-xl backdrop-blur-sm sm:p-10">
          <p className="font-display text-2xl leading-relaxed italic text-fg sm:text-[1.7rem]">
            {typed}
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[1.05em] w-[0.09em] translate-y-[0.12em] animate-[blink_1.1s_step-end_infinite] bg-primary align-baseline"
            />
          </p>
        </div>

        {/* The wordmark already lives in the header; the hero leads with the
            story, so the page's H1 stays for semantics/screen readers. */}
        <h1 className="sr-only">{t.home.srHeading}</h1>

        <p className="max-w-md text-base leading-relaxed text-fg-muted">
          {t.home.tagline}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href={ctaHref}
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            {t.home.startAdventure}
          </Link>
          <Link
            href="/lobby"
            className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            {t.home.browseLobbies}
          </Link>
        </div>

        {/* Quiet capability line — what you actually get. Not a numbered
            sequence, so no numbered markers. */}
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
          <span>{t.home.capabilities.dm}</span>
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span>{t.home.capabilities.party}</span>
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span>{t.home.capabilities.dice}</span>
        </p>
      </div>
    </main>
  );
}
