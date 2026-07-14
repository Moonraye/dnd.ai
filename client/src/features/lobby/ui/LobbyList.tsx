'use client';

import { Button } from '@/shared/ui';
import { useLobbyList } from '../model/useLobbyList';
import { CampaignCard } from './CampaignCard';

export function LobbyList() {
  const { lobbies, isLoading, error, refresh } = useLobbyList();

  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-border bg-bg-subtle"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-6">
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  if (lobbies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <p className="font-display text-lg text-fg">No campaigns yet</p>
        <p className="max-w-sm text-sm text-fg-muted">
          Start the first table and the dungeon master will meet you there.
        </p>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lobbies.map((lobby) => (
        <CampaignCard key={lobby.id} lobby={lobby} />
      ))}
    </div>
  );
}
