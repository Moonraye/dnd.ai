'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChatInput, ChatWindow, useSessionSocket } from '@/features/session-chat';
import { useAuthStore } from '@/shared/store/authStore';
import type { JoinStatus } from '@/shared/store/sessionStore';

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

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  if (authStatus !== 'authenticated') return null;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">
            {session?.title ?? 'Loading session…'}
          </h1>
          <Link href="/lobby" className="text-sm text-zinc-500 underline">
            ← Back to lobby
          </Link>
        </div>
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
      </header>
      {joinStatus === 'error' && joinError ? (
        <p role="alert" className="text-sm text-red-600">
          {joinError}
        </p>
      ) : null}
      <ChatWindow messages={messages} />
      <ChatInput sessionId={sessionId} disabled={joinStatus !== 'joined'} />
    </main>
  );
}
