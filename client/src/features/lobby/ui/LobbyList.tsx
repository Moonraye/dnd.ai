'use client';

import Link from 'next/link';
import { useLobbyList } from '../model/useLobbyList';

export function LobbyList() {
  const { lobbies, isLoading, error, refresh } = useLobbyList();

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading lobbies…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (lobbies.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No open lobbies yet — create the first one!
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-sm flex-col gap-2">
      {lobbies.map((lobby) => (
        <li key={lobby.id}>
          <Link
            href={`/session/${lobby.id}`}
            className="flex items-center justify-between rounded-md border border-zinc-300 px-4 py-3 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <span className="font-medium">{lobby.title}</span>
            <span className="text-sm text-zinc-500">Join →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
