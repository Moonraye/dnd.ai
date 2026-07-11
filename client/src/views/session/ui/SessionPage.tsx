'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CharacterCreationForm,
  useMyCharacter,
} from '@/features/character-sheet';
import { DiceRollerPanel, useRollDice } from '@/features/dice-roller';
import { ChatInput, ChatWindow, useSessionSocket } from '@/features/session-chat';
import { useAuthStore } from '@/shared/store/authStore';
import type { JoinStatus } from '@/shared/store/sessionStore';
import { CharacterHud } from '@/widgets/character-hud';

interface SessionPageProps {
  sessionId: string;
}

const STATUS_LABELS: Record<JoinStatus, string> = {
  idle: 'Connecting…',
  connecting: 'Connecting…',
  joined: 'Connected',
  error: 'Connection error',
};

export function SessionPage({ sessionId }: SessionPageProps) {
  const router = useRouter();
  const authStatus = useAuthStore((state) => state.status);
  const { session, messages, joinStatus, joinError } =
    useSessionSocket(sessionId);
  const { myCharacter, isKnown } = useMyCharacter();
  const { roll } = useRollDice(sessionId);
  const [hudOpen, setHudOpen] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  if (authStatus !== 'authenticated') return null;

  // Decision 2: creation gates session entry — no sheet, no chat.
  const needsCharacter = isKnown && !myCharacter;
  const disabled = joinStatus !== 'joined';

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">
            {session?.title ?? 'Loading session…'}
          </h1>
          <Link href="/lobby" className="text-sm text-zinc-500 underline">
            ← Back to lobby
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {!needsCharacter && myCharacter ? (
            <button
              type="button"
              onClick={() => setHudOpen(true)}
              className="rounded-md border border-zinc-400 px-3 py-1 text-sm font-medium lg:hidden dark:border-zinc-600"
            >
              Character
            </button>
          ) : null}
          <span
            className={
              joinStatus === 'joined'
                ? 'rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-200'
                : joinStatus === 'error'
                  ? 'rounded-full bg-red-100 px-3 py-1 text-sm text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            }
          >
            {STATUS_LABELS[joinStatus]}
          </span>
        </div>
      </header>
      {joinStatus === 'error' && joinError ? (
        <p role="alert" className="text-sm text-red-600">
          {joinError}
        </p>
      ) : null}

      {needsCharacter ? (
        <section className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold">Create your character</h2>
          <p className="text-sm text-zinc-500">
            You need a character sheet before joining the table.
          </p>
          <CharacterCreationForm sessionId={sessionId} />
        </section>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-col gap-4">
            <ChatWindow messages={messages} />
            <DiceRollerPanel sessionId={sessionId} disabled={disabled} />
            <ChatInput
              sessionId={sessionId}
              disabled={disabled}
              onRollCommand={roll}
            />
          </div>
          <div className="hidden overflow-y-auto lg:block">
            <CharacterHud sessionId={sessionId} />
          </div>
        </div>
      )}

      {hudOpen ? (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            type="button"
            aria-label="Close character panel"
            onClick={() => setHudOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-4 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setHudOpen(false)}
              className="mb-3 text-sm text-zinc-500"
            >
              Close ✕
            </button>
            <CharacterHud sessionId={sessionId} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
