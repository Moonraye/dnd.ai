import { create } from 'zustand';

export type ServerStatus = 'unknown' | 'checking' | 'awake' | 'asleep';

interface ServerStatusState {
  status: ServerStatus;
  checkHealth: (timeoutMs?: number) => Promise<ServerStatus>;
}

const DEFAULT_TIMEOUT_MS = 4_000;

/**
 * ADR 7: the Render free-tier backend cold-starts (~50s) after idling. This
 * store answers "is it awake right now" for gating decisions (home-page ping,
 * lobby-entry check) — a short timeout on purpose, since the full wake-up
 * wait is the wait-room's job, not this store's. Not persisted: a fresh page
 * load should always re-check rather than trust stale state.
 */
export const useServerStatusStore = create<ServerStatusState>((set, get) => ({
  status: 'unknown',
  checkHealth: async (timeoutMs = DEFAULT_TIMEOUT_MS) => {
    if (get().status === 'checking') return get().status;
    set({ status: 'checking' });
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      const status = response.ok ? 'awake' : 'asleep';
      set({ status });
      return status;
    } catch {
      set({ status: 'asleep' });
      return 'asleep';
    }
  },
}));
