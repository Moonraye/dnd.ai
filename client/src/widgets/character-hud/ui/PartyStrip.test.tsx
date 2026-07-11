import type { CharacterSheetPayload } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { PartyStrip } from './PartyStrip';

const makeCharacter = (id: string, name: string): CharacterSheetPayload => ({
  id,
  userId: `user-${id}`,
  sessionId: 'session-1',
  name,
  hpCurrent: 10,
  hpMax: 20,
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
});

describe('PartyStrip', () => {
  beforeEach(() => useSessionStore.getState().reset());

  it('lists other party members and excludes the caller', () => {
    useSessionStore
      .getState()
      .setCharacters([
        makeCharacter('me', 'Thorin'),
        makeCharacter('other', 'Elora'),
      ]);

    render(<PartyStrip ownCharacterId="me" />);

    expect(screen.getByText('Elora')).toBeInTheDocument();
    expect(screen.queryByText('Thorin')).not.toBeInTheDocument();
  });

  it('shows an empty state when alone', () => {
    useSessionStore.getState().setCharacters([makeCharacter('me', 'Thorin')]);

    render(<PartyStrip ownCharacterId="me" />);

    expect(screen.getByText(/no other adventurers/i)).toBeInTheDocument();
  });
});
