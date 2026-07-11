import type {
  CharacterSheetPayload,
  ChatMessagePayload,
  SessionSummary,
} from '@dnd/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type JoinStatus = 'idle' | 'connecting' | 'joined' | 'error';

interface SessionState {
  sessionId: string | null;
  session: SessionSummary | null;
  messages: ChatMessagePayload[];
  /** Party sheets in the room, feeding the HUD and party strip. */
  characters: CharacterSheetPayload[];
  /** ISO timestamp of the newest received message (ADR 6 catch-up cursor). */
  lastMessageAt: string | null;
  joinStatus: JoinStatus;
  joinError: string | null;
  knownMessageIds: Set<string>;
  setActiveSession: (sessionId: string) => void;
  setSessionInfo: (session: SessionSummary) => void;
  setJoinStatus: (status: JoinStatus, error?: string) => void;
  addMessages: (incoming: ChatMessagePayload[]) => void;
  setCharacters: (characters: CharacterSheetPayload[]) => void;
  upsertCharacter: (character: CharacterSheetPayload) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  session: null,
  messages: [],
  characters: [] as CharacterSheetPayload[],
  lastMessageAt: null,
  joinStatus: 'idle' as JoinStatus,
  joinError: null,
  knownMessageIds: new Set<string>(),
};

/**
 * ADR 6: active-session state, persisted to sessionStorage so a page reload
 * mid-game only refetches messages newer than `lastMessageAt`.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveSession: (sessionId) =>
        set((state) =>
          state.sessionId === sessionId
            ? { sessionId }
            : { ...initialState, sessionId, knownMessageIds: new Set<string>() },
        ),

      setSessionInfo: (session) => set({ session }),

      setJoinStatus: (joinStatus, error) =>
        set({ joinStatus, joinError: error ?? null }),

      addMessages: (incoming) =>
        set((state) => {
          const fresh = incoming.filter((message) => !state.knownMessageIds.has(message.id));
          if (fresh.length === 0) return state;

          const nextKnown = new Set(state.knownMessageIds);
          fresh.forEach((message) => nextKnown.add(message.id));

          let messages = [...state.messages, ...fresh];

          // Only sort if first fresh message is out of order relative to the current tail
          const tail = state.messages[state.messages.length - 1];
          if (tail && fresh[0].createdAt < tail.createdAt) {
            messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          }

          return {
            messages,
            knownMessageIds: nextKnown,
            lastMessageAt: messages[messages.length - 1].createdAt,
          };
        }),

      setCharacters: (characters) => set({ characters }),

      upsertCharacter: (character) =>
        set((state) => {
          const index = state.characters.findIndex(
            (existing) => existing.id === character.id,
          );
          if (index === -1) {
            return { characters: [...state.characters, character] };
          }
          const characters = [...state.characters];
          characters[index] = character;
          return { characters };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'dnd-session',
      storage: createJSONStorage(() => sessionStorage),
      // Messages are refetched via `since` on join; persist only the cursor.
      partialize: (state) => ({
        sessionId: state.sessionId,
        lastMessageAt: state.lastMessageAt,
      }),
      // sessionStorage does not exist during SSR; rehydrate manually in an
      // effect (see useSessionSocket) to avoid hydration mismatches.
      skipHydration: true,
    },
  ),
);
