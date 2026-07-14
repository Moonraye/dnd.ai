import type { CharacterSheetPayload, ChatMessagePayload } from '@dnd/shared';
import { useSessionStore } from './sessionStore';

const makeMessage = (
  id: string,
  createdAt: string,
): ChatMessagePayload => ({
  id,
  sessionId: 'session-1',
  senderType: 'HUMAN',
  senderName: 'Tester',
  messageText: `message ${id}`,
  createdAt,
});

const makeCharacter = (
  id: string,
  hpCurrent: number,
): CharacterSheetPayload => ({
  id,
  userId: `user-${id}`,
  sessionId: 'session-1',
  name: `Hero ${id}`,
  hpCurrent,
  hpMax: 20,
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
});

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('appends messages and advances the lastMessageAt cursor', () => {
    useSessionStore
      .getState()
      .addMessages([makeMessage('a', '2026-07-10T12:00:00.000Z')]);
    useSessionStore
      .getState()
      .addMessages([makeMessage('b', '2026-07-10T12:01:00.000Z')]);

    const state = useSessionStore.getState();
    expect(state.messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(state.lastMessageAt).toBe('2026-07-10T12:01:00.000Z');
  });

  it('deduplicates messages by id', () => {
    const message = makeMessage('a', '2026-07-10T12:00:00.000Z');
    useSessionStore.getState().addMessages([message]);
    useSessionStore.getState().addMessages([message]);

    expect(useSessionStore.getState().messages).toHaveLength(1);
  });

  it('keeps messages sorted by createdAt when catch-up arrives late', () => {
    useSessionStore
      .getState()
      .addMessages([makeMessage('later', '2026-07-10T12:05:00.000Z')]);
    useSessionStore
      .getState()
      .addMessages([makeMessage('earlier', '2026-07-10T12:00:00.000Z')]);

    expect(
      useSessionStore.getState().messages.map((m) => m.id),
    ).toEqual(['earlier', 'later']);
  });

  it('resets cached messages when switching to another session', () => {
    const store = useSessionStore.getState();
    store.setActiveSession('session-1');
    store.addMessages([makeMessage('a', '2026-07-10T12:00:00.000Z')]);

    useSessionStore.getState().setActiveSession('session-2');

    const state = useSessionStore.getState();
    expect(state.sessionId).toBe('session-2');
    expect(state.messages).toHaveLength(0);
    expect(state.lastMessageAt).toBeNull();
  });

  it('keeps cached messages when re-activating the same session', () => {
    const store = useSessionStore.getState();
    store.setActiveSession('session-1');
    store.addMessages([makeMessage('a', '2026-07-10T12:00:00.000Z')]);

    useSessionStore.getState().setActiveSession('session-1');

    expect(useSessionStore.getState().messages).toHaveLength(1);
  });

  it('hydrates the party list with setCharacters', () => {
    useSessionStore
      .getState()
      .setCharacters([makeCharacter('a', 20), makeCharacter('b', 15)]);

    expect(useSessionStore.getState().characters).toHaveLength(2);
  });

  it('replaces an existing character by id on upsert', () => {
    useSessionStore.getState().setCharacters([makeCharacter('a', 20)]);
    useSessionStore.getState().upsertCharacter(makeCharacter('a', 5));

    const { characters } = useSessionStore.getState();
    expect(characters).toHaveLength(1);
    expect(characters[0].hpCurrent).toBe(5);
  });

  it('appends a new character on upsert', () => {
    useSessionStore.getState().setCharacters([makeCharacter('a', 20)]);
    useSessionStore.getState().upsertCharacter(makeCharacter('b', 12));

    expect(useSessionStore.getState().characters.map((c) => c.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('clears characters when switching sessions', () => {
    const store = useSessionStore.getState();
    store.setActiveSession('session-1');
    store.setCharacters([makeCharacter('a', 20)]);

    useSessionStore.getState().setActiveSession('session-2');

    expect(useSessionStore.getState().characters).toHaveLength(0);
  });
});
