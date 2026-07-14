import type { CharacterSheetPayload } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/shared/store/authStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { PartyRoster } from './PartyRoster';

const makeCharacter = (
  id: string,
  name: string,
  userId: string,
): CharacterSheetPayload => ({
  id,
  userId,
  sessionId: 'session-1',
  name,
  hpCurrent: 10,
  hpMax: 20,
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
  ownerId: null,
  persona: null,
});

describe('PartyRoster', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useAuthStore.setState({ user: { id: 'user-me' } as never });
  });

  it('lists every seat and marks the caller as "You"', () => {
    useSessionStore
      .getState()
      .setCharacters([
        makeCharacter('me', 'Thorin', 'user-me'),
        makeCharacter('other', 'Elora', 'user-other'),
      ]);

    render(<PartyRoster />);

    expect(screen.getByText('Thorin')).toBeInTheDocument();
    expect(screen.getByText('Elora')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows an empty state when no one has joined', () => {
    render(<PartyRoster />);

    expect(screen.getByText(/no adventurers have taken a seat/i)).toBeInTheDocument();
  });
});
