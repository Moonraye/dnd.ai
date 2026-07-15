'use client';

import type { Language } from '@dnd/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import { useLobbyList } from '../model/useLobbyList';
import { CampaignCard } from './CampaignCard';

type LobbyFilter = 'all' | Language;

export function LobbyList() {
  const { t, language } = useTranslation();
  const { lobbies, isLoading, error, refresh } = useLobbyList();
  // Defaults to the viewer's UI language on first render only — a later
  // language switch must not override an explicit tab choice.
  const [filter, setFilter] = useState<LobbyFilter>(() => language);
  const filteredLobbies = useMemo(
    () => (filter === 'all' ? lobbies : lobbies.filter((lobby) => lobby.language === filter)),
    [lobbies, filter],
  );

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
          {t.lobby.tryAgain}
        </Button>
      </div>
    );
  }

  if (lobbies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <p className="font-display text-lg text-fg">{t.lobby.empty.title}</p>
        <p className="max-w-sm text-sm text-fg-muted">{t.lobby.empty.subtitle}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Tabs value={filter} onValueChange={(value: string) => setFilter(value as LobbyFilter)}>
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="all">{t.lobby.filter.all}</TabsTrigger>
          <TabsTrigger value="en">{t.common.language.english}</TabsTrigger>
          <TabsTrigger value="uk">{t.common.language.ukrainian}</TabsTrigger>
        </TabsList>
      </Tabs>
      {filteredLobbies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-display text-lg text-fg">{t.lobby.emptyFiltered.title}</p>
          <p className="max-w-sm text-sm text-fg-muted">{t.lobby.emptyFiltered.subtitle}</p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLobbies.map((lobby) => (
            <CampaignCard key={lobby.id} lobby={lobby} />
          ))}
        </div>
      )}
    </div>
  );
}
