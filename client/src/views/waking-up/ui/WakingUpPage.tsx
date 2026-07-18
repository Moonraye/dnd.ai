'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useServerStatusStore } from '@/shared/store/serverStatusStore';
import { Header } from '@/widgets/header';

// ADR 7: Render's free tier cold-starts in ~50s. Poll fast at first (covers
// the common "already mostly awake" case quickly), then back off, and stop
// polling automatically past a point where something is probably wrong.
const FAST_INTERVAL_MS = 3_000;
const SLOW_INTERVAL_MS = 5_000;
const FAST_WINDOW_MS = 20_000;
const GIVE_UP_MS = 90_000;

function WakingUpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/lobby';
  const { t } = useTranslation();
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number;
    startedAtRef.current = Date.now();

    const poll = async () => {
      const status = await useServerStatusStore.getState().checkHealth();
      if (cancelled) return;

      if (status === 'awake') {
        router.replace(next);
        return;
      }

      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (elapsed >= GIVE_UP_MS) {
        setTimedOut(true);
        return;
      }

      const interval = elapsed < FAST_WINDOW_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
      timeoutId = window.setTimeout(poll, interval);
    };

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [next, router, attempt]);

  const handleRetry = () => {
    setTimedOut(false);
    setAttempt((n) => n + 1);
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span
          aria-hidden
          className="h-12 w-12 animate-pulse rounded-full border border-border bg-surface/70 shadow-xl"
        />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
          {t.wakingUp.title}
        </h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          {timedOut ? t.wakingUp.timedOut : t.wakingUp.subtitle}
        </p>
        {timedOut && (
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            {t.wakingUp.retry}
          </button>
        )}
      </div>
    </main>
  );
}

export function WakingUpPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <WakingUpPageInner />
      </Suspense>
    </>
  );
}
