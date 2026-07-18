'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateCampaignDialog, LobbyList } from '@/features/lobby';
import { useTranslation } from '@/shared/i18n';
import { useAuthStore } from '@/shared/store/authStore';
import { useServerStatusStore } from '@/shared/store/serverStatusStore';
import { Header } from '@/widgets/header';

export function LobbyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const serverStatus = useServerStatusStore((state) => state.status);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    // ADR 7: a deep-linked/bookmarked visit may land here without ever
    // hitting the home page's wake-up ping, so check for ourselves.
    if (serverStatus === 'unknown') {
      void useServerStatusStore.getState().checkHealth();
    } else if (serverStatus === 'asleep') {
      router.push('/waking-up?next=/lobby');
    }
  }, [serverStatus, router]);

  if (status === 'loading') {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          <div className="mb-8 h-9 w-56 animate-pulse rounded bg-bg-subtle" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-bg-subtle"
              />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (status !== 'authenticated') return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
              {t.lobby.title}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{t.lobby.subtitle}</p>
          </div>
          <CreateCampaignDialog />
        </div>
        <LobbyList />
      </main>
    </>
  );
}
