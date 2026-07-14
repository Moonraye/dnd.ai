'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/shared/ui';

// The AI DM's opening read-aloud. Boxed/italic "read-aloud text" is the D&D
// convention for what the DM narrates to set a scene — so the landing hero is
// that exact artifact, written live in front of the visitor.
const OPENING_SCENE =
  'The tavern door groans shut behind you. Rain hammers the shutters, and the hearth throws long shadows across a room gone suddenly quiet. A hooded figure slides a sealed letter across your table — and asks if you are brave enough to break the wax.';

const TYPE_MS = 26;

export function HeroScene() {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(OPENING_SCENE);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(OPENING_SCENE.slice(0, i));
      if (i >= OPENING_SCENE.length) window.clearInterval(id);
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient candlelight — the one atmospheric flourish. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute left-1/2 top-[40%] h-64 w-[30rem] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[110px]" />
      </div>

      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          AI dungeon master · Live table
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
        <h1 className="sr-only">
          DunDrAI — real-time multiplayer D&amp;D with AI dungeon masters
        </h1>

        <p className="max-w-md text-base leading-relaxed text-fg-muted">
          A dungeon master that never cancels, and a party that is always
          seated. Spin up a campaign in seconds and play it out in real time.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/signup"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            Start your adventure
          </Link>
          <Link
            href="/lobby"
            className="text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            Browse open lobbies →
          </Link>
        </div>

        {/* Quiet capability line — what you actually get. Not a numbered
            sequence, so no numbered markers. */}
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
          <span>AI dungeon master</span>
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span>AI party members</span>
          <span aria-hidden className="text-border-strong">
            ·
          </span>
          <span>Real dice, real rules</span>
        </p>
      </div>
    </main>
  );
}
