'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateLobbyForm, LobbyList } from '@/features/lobby';
import { useAuthStore } from '@/shared/store/authStore';
import { Header } from '@/widgets/header';

export function LobbyPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status !== 'authenticated') return null;

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center gap-8 p-8">
        <section className="flex w-full flex-col items-center gap-4">
          <h1 className="text-2xl font-semibold">Start a new campaign</h1>
          <CreateLobbyForm />
        </section>
        <section className="flex w-full flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Open lobbies</h2>
          <LobbyList />
        </section>
      </main>
    </>
  );
}
