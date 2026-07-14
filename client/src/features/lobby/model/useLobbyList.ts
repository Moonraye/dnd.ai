'use client';

import type { SessionSummary } from '@dnd/shared';
import { useCallback, useEffect, useState } from 'react';
import { listLobbies } from '../api/lobbyApi';

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Failed to load lobbies';

export function useLobbyList() {
  const [lobbies, setLobbies] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return { lobbies, isLoading, error, refresh };
}
