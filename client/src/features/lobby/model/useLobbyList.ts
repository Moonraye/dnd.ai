'use client';

import type { SessionSummary } from '@dnd/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { listLobbies } from '../api/lobbyApi';

export function useLobbyList() {
  const { t } = useTranslation();
  const [lobbies, setLobbies] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toErrorMessage = useCallback(
    (err: unknown): string =>
      err instanceof Error ? err.message : t.errors.loadLobbiesFailed,
    [t],
  );

  useEffect(() => {
    let cancelled = false;

    listLobbies()
      .then((result) => {
        if (cancelled) return;
        setLobbies(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(toErrorMessage(err));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount only — a language switch must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLobbies(await listLobbies());
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [toErrorMessage]);

  return { lobbies, isLoading, error, refresh };
}
