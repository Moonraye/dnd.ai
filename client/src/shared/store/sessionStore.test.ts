import type { ChatMessagePayload } from '@dnd/shared';
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
});
